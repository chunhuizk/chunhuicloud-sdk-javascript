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
    verbosity?: io.LogLevel
    useWebsocket?: boolean;
    signingRegion?: string;
    proxyHost?: string;
    proxyPort?: number;
    caFilePath?: string;
    csrFilePath?: string;
}
type Args = IExecProvisionProps;

export async function execProvision(argv: Args): Promise<void> {
    if (argv.verbose !== 'none' && argv.verbosity !== undefined) {
        const level: io.LogLevel = parseInt(io.LogLevel[argv.verbosity], 10);
        io.enable_logging(level);
    }

    const clientBootstrap = new io.ClientBootstrap();

    let configBuilder = null;

    if (argv.useWebsocket) {

        let proxyOptions;
        if (argv.proxyHost && argv.proxyPort !== undefined) {
            proxyOptions = new http.HttpProxyOptions(argv.proxyHost, argv.proxyPort);
        }

        if (!argv.signingRegion) {
            throw new Error("argv.signing_region undefined")
        }

        configBuilder = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
            region: argv.signingRegion,
            credentials_provider: auth.AwsCredentialsProvider.newDefault(clientBootstrap),
            proxy_options: proxyOptions
        });

    } else {
        configBuilder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(argv.provisionCertPath, argv.provisionKeyPath);
    }

    if (argv.caFilePath) {
        configBuilder.with_certificate_authority_from_path(undefined, argv.caFilePath);
    }

    configBuilder.with_clean_session(false);
    configBuilder.with_client_id(argv.clientId);
    configBuilder.with_endpoint(argv.endpoint);

    // force node to wait 60 seconds before killing itself, promises do not keep node alive
    const timer = setTimeout(() => { console.log("TimerUp") }, 60 * 1000);

    const config = configBuilder.build();
    const client = new mqtt.MqttClient(clientBootstrap);
    const connection = client.new_connection(config);
    const identity = new iotidentity.IotIdentityClient(connection);
    await connection.connect();

    if (argv.csrFilePath) {
        // Csr workflow
        throw new Error("SCR workflow not support!")
    } else {
        // Keys workflow
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
            let certificateOwnershipToken: string | null = null;
            let keysAndCertificate: iotidentity.model.CreateKeysAndCertificateResponse | null = null;
            let thing: iotidentity.model.RegisterThingResponse | null = null;

            function keysAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.CreateKeysAndCertificateResponse) {
                if (response) {
                    console.log("CreateKeysAndCertificateResponse for certificateId=" + response.certificateId);
                    if (response.certificateOwnershipToken && response.certificatePem && response.privateKey) {
                        certificateOwnershipToken = response.certificateOwnershipToken;
                        keysAndCertificate = response
                    }
                } else if (error) {
                    reject(error);
                    return;
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
                    reject(error);
                    return;
                }
            }

            function registerAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.RegisterThingResponse) {
                if (response) {
                    console.log("RegisterThingResponse for thingName=" + response.thingName);
                    thing = response
                } else if (error) {
                    reject(error);
                    return;
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
                    reject(error);
                    return;
                }
            }

            function done() {
                if (thing && keysAndCertificate) {
                    resolve({ thingResponse: thing, keysAndCertificateResponse: keysAndCertificate })
                    return;
                } else {
                    reject(new Error(`thing or keysAndCertificate are null or undefined, ${{ thing, keysAndCertificate }}`))
                    return;
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

            const registerThing: iotidentity.model.RegisterThingRequest = { parameters: map, templateName: argv.templateName, certificateOwnershipToken };
            await identity.publishRegisterThing(
                registerThing,
                mqtt.QoS.AtLeastOnce);

        } catch (err) {

            reject(err);
            return
            
        }
    });
}