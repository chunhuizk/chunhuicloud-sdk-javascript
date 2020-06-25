import { auth, http, io, iot } from 'aws-crt';
import { mqtt, iotidentity } from 'aws-iot-device-sdk-v2'
import fs = require('fs');

export interface IExecProvisionProps {
    provisionCertPath: string;
    provisionKeyPath: string;
    grantCertPath: string;
    grantKeyPath: string;
    clientId: string;
    endpoint: string;
    templateName: string;
    templateParameters?: string;

    verbose?: string;
    verbosity: io.LogLevel
    useWebsocket?: boolean;
    signingRegion?: string;
    proxyHost?: string;
    proxyPort?: number;
    caFilePath?: string;
    csrFilePath?: string;
}
type Args = IExecProvisionProps;

export async function execProvision(argv: Args): Promise<void> {
    if (argv.verbose != 'none') {
        const level: io.LogLevel = parseInt(io.LogLevel[argv.verbosity]);
        io.enable_logging(level);
    }

    const client_bootstrap = new io.ClientBootstrap();

    let config_builder = null;

    if (argv.useWebsocket) {

        let proxy_options = undefined;
        if (argv.proxyHost && argv.proxyPort !== undefined) {
            proxy_options = new http.HttpProxyOptions(argv.proxyHost, argv.proxyPort);
        }

        if (!argv.signingRegion) {
            throw new Error("argv.signing_region undefined")
        }

        config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
            region: argv.signingRegion,
            credentials_provider: auth.AwsCredentialsProvider.newDefault(client_bootstrap),
            proxy_options: proxy_options
        });

    } else {
        config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(argv.provisionCertPath, argv.provisionKeyPath);
    }

    if (argv.caFilePath) {
        config_builder.with_certificate_authority_from_path(undefined, argv.caFilePath);
    }

    config_builder.with_clean_session(false);
    config_builder.with_client_id(argv.clientId);
    config_builder.with_endpoint(argv.endpoint);

    // force node to wait 60 seconds before killing itself, promises do not keep node alive
    const timer = setTimeout(() => { }, 60 * 1000);

    const config = config_builder.build();
    const client = new mqtt.MqttClient(client_bootstrap);
    const connection = client.new_connection(config);
    const identity = new iotidentity.IotIdentityClient(connection);
    await connection.connect();

    if (argv.csrFilePath) {
        //Csr workflow
        throw new Error("SCR workflow not support!")
    } else {
        //Keys workflow
        try {
            const { thingResponse, keysAndCertificateResponse } = await execute_keys_session(identity, argv);
            const { thingName } = thingResponse
            const { certificatePem, privateKey } = keysAndCertificateResponse
            
            if (!certificatePem) {
                throw new Error("certificate not exist")
            }
            await fs.promises.writeFile(argv.grantCertPath, certificatePem)
            console.log(`grantCertPath SAVED: ${argv.grantCertPath}`);
            if (!privateKey) {
                throw new Error("privateKey not exist")
            }
            await fs.promises.writeFile(argv.grantKeyPath, privateKey)
            console.log(`grantKeyPath SAVED: ${argv.grantKeyPath}`);

            console.log("Provision SUCCESS");

            clearTimeout(timer);
            return Promise.resolve()

        } catch (err) {
            return Promise.reject(err)
        }

    }
}

interface IExecKeysSessionResponse {
    keysAndCertificateResponse: iotidentity.model.CreateKeysAndCertificateResponse,
    thingResponse: iotidentity.model.RegisterThingResponse
}

async function execute_keys_session(identity: iotidentity.IotIdentityClient, argv: Args): Promise<IExecKeysSessionResponse> {
    return new Promise(async (resolve, reject) => {
        try {
            var certificateOwnershipToken: string | null = null;
            var keysAndCertificate: iotidentity.model.CreateKeysAndCertificateResponse | null = null;
            var thing: iotidentity.model.RegisterThingResponse | null = null;

            function keysAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.CreateKeysAndCertificateResponse) {
                if (response) {
                    console.log("CreateKeysAndCertificateResponse for certificateId=" + response.certificateId);
                    if (response.certificateOwnershipToken && response.certificatePem && response.privateKey) {
                        certificateOwnershipToken = response.certificateOwnershipToken;
                        keysAndCertificate = response
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
                    thing = response
                }

                if (error) {
                    console.log("Error occurred..");
                }

                done()
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

            function done() {
                if (thing && keysAndCertificate) {
                    resolve({ thingResponse: thing, keysAndCertificateResponse: keysAndCertificate })
                } else {
                    reject(new Error(`thing or keysAndCertificate are null or undefined, ${{ thing, keysAndCertificate }}`))
                }
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
            const registerThingSubRequest: iotidentity.model.RegisterThingSubscriptionRequest = { templateName: argv.templateName };
            await identity.subscribeToRegisterThingAccepted(
                registerThingSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => registerAccepted(error, response));

            await identity.subscribeToRegisterThingRejected(
                registerThingSubRequest,
                mqtt.QoS.AtLeastOnce,
                (error, response) => registerRejected(error, response));

            console.log("Publishing to RegisterThing topic..");
            const map: { [key: string]: string } = JSON.parse(argv.templateParameters || "{}");

            if (certificateOwnershipToken === null) {
                throw new Error("certificateOwnershipToken is null")
            }
            const registerThing: iotidentity.model.RegisterThingRequest = { parameters: map, templateName: argv.templateName, certificateOwnershipToken: certificateOwnershipToken };
            await identity.publishRegisterThing(
                registerThing,
                mqtt.QoS.AtLeastOnce);
        }
        catch (error) {
            reject(error);
        }
    });
}