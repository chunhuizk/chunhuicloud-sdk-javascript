import { auth, http, io, iot } from 'aws-crt';
import { mqtt, iotidentity } from 'aws-iot-device-sdk-v2'

export interface IExecProvisionProps {
    verbose?: string;
    verbosity: io.LogLevel
    use_websocket?: boolean;
    proxy_host?: string;
    proxy_port?: number;
    signing_region?: string;
    ca_file?: string;
    csr_file?: string;
    cert: string;
    key: string;
    client_id: string;
    endpoint: string;
    template_name: string;
    template_parameters?: string;
}
type Args = IExecProvisionProps;

export async function execProvision(argv: Args) {
    if (argv.verbose != 'none') {
        const level: io.LogLevel = parseInt(io.LogLevel[argv.verbosity]);
        io.enable_logging(level);
    }

    const client_bootstrap = new io.ClientBootstrap();

    let config_builder = null;
    if (argv.use_websocket) {
        let proxy_options = undefined;
        if (argv.proxy_host && argv.proxy_port !== undefined) {
            proxy_options = new http.HttpProxyOptions(argv.proxy_host, argv.proxy_port);
        }

        if (!argv.signing_region) {
            throw new Error("argv.signing_region undefined")
        }

        config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
            region: argv.signing_region,
            credentials_provider: auth.AwsCredentialsProvider.newDefault(client_bootstrap),
            proxy_options: proxy_options
        });
    } else {
        config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(argv.cert, argv.key);
    }


    if (argv.ca_file) {
        config_builder.with_certificate_authority_from_path(undefined, argv.ca_file);
    }

    config_builder.with_clean_session(false);
    config_builder.with_client_id(argv.client_id);
    config_builder.with_endpoint(argv.endpoint);

    // force node to wait 60 seconds before killing itself, promises do not keep node alive
    const timer = setTimeout(() => { }, 60 * 1000);

    const config = config_builder.build();
    const client = new mqtt.MqttClient(client_bootstrap);
    const connection = client.new_connection(config);

    const identity = new iotidentity.IotIdentityClient(connection);

    await connection.connect();

    if (argv.csr_file) {
        //Csr workflow
        throw new Error("SCR workflow not support!")
    } else {
        //Keys workflow
        await execute_keys_session(identity, argv);
    }

    // Allow node to die if the promise above resolved
    clearTimeout(timer);
}

async function execute_keys_session(identity: iotidentity.IotIdentityClient, argv: Args) {
    return new Promise(async (resolve, reject) => {
        try {
            var certificateOwnershipToken: string | null = null;
            var certificatePem: string | null = null;
            var privateKey: string | null = null;

            function keysAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.CreateKeysAndCertificateResponse) {
                if (response) {
                    console.log("CreateKeysAndCertificateResponse for certificateId=" + response.certificateId);
                    if (response.certificateOwnershipToken && response.certificatePem && response.privateKey) {
                        certificateOwnershipToken = response.certificateOwnershipToken;
                        certificatePem = response.certificatePem
                        privateKey = response.privateKey
                    }
                }

                if (error) {
                    console.log("Error occurred..");
                    reject(error);
                }
            }

            function keysRejected(error?: iotidentity.IotIdentityError, response?: iotidentity.model.ErrorResponse) {
                if (response) {
                    console.log("CreateKeysAndCertificate ErrorResponse for " +
                        " statusCode=:" + response.statusCode +
                        " errorCode=:" + response.errorCode +
                        " errorMessage=:" + response.errorMessage);
                }
                if (error) {
                    console.log("Error occurred..");
                    reject(error);
                }
            }

            function registerAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.RegisterThingResponse) {
                if (response) {
                    console.log("RegisterThingResponse for thingName=" + response.thingName);
                }

                if (error) {
                    console.log("Error occurred..");
                }
                return;
            }

            function registerRejected(error?: iotidentity.IotIdentityError, response?: iotidentity.model.ErrorResponse) {
                if (response) {
                    console.log("RegisterThing ErrorResponse for " +
                        "statusCode=:" + response.statusCode +
                        "errorCode=:" + response.errorCode +
                        "errorMessage=:" + response.errorMessage);
                }
                if (error) {
                    console.log("Error occurred..");
                }
                return;
            }

            console.log("Subscribing to CreateKeysAndCertificate Accepted and Rejected topics..");

            const keysSubRequest: iotidentity.model.CreateKeysAndCertificateSubscriptionRequest = {};

            await identity.subscribeToCreateKeysAndCertificateAccepted(
                keysSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => keysAccepted(error, response));

            await identity.subscribeToCreateKeysAndCertificateRejected(
                keysSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => keysRejected(error, response));

            console.log("Publishing to CreateKeysAndCertificate topic..");
            const keysRequest: iotidentity.model.CreateKeysAndCertificateRequest = { toJSON() { return {}; } };

            await identity.publishCreateKeysAndCertificate(
                keysRequest,
                mqtt.QoS.AtLeastOnce);

            console.log("Subscribing to RegisterThing Accepted and Rejected topics..");
            const registerThingSubRequest: iotidentity.model.RegisterThingSubscriptionRequest = { templateName: argv.template_name };
            await identity.subscribeToRegisterThingAccepted(
                registerThingSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => registerAccepted(error, response));

            await identity.subscribeToRegisterThingRejected(
                registerThingSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => registerRejected(error, response));

            console.log("Publishing to RegisterThing topic..");
            const map: { [key: string]: string } = JSON.parse(argv.template_parameters || "{}");

            if (certificateOwnershipToken === null) {
                throw new Error("certificateOwnershipToken is null")
            }
            const registerThing: iotidentity.model.RegisterThingRequest = { parameters: map, templateName: argv.template_name, certificateOwnershipToken: certificateOwnershipToken };
            await identity.publishRegisterThing(
                registerThing,
                mqtt.QoS.AtLeastOnce);
        }
        catch (error) {
            reject(error);
        }
    });
}