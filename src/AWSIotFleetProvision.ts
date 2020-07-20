import { auth, http, io, iot } from 'aws-crt';
import { mqtt as awsMqtt, iotidentity } from 'aws-iot-device-sdk-v2'
import mqtt from 'mqtt'
import fs = require('fs');

export const AWS_IOT_PROVISION_TOPICS = {
    createCertificaties: "$aws/certificates/create/json",
    createCertificatiesAccepted: "$aws/certificates/create/json/accepted",
    createCertificatiesRejected: "$aws/certificates/create/json/rejected",
    registerThing: (templateName: string) => `$aws/provisioning-templates/${templateName}/provision/json`,
    registerThingAccepted: (templateName: string) => `$aws/provisioning-templates/${templateName}/provision/json/accepted`,
    registerThingRejected: (templateName: string) => `$aws/provisioning-templates/${templateName}/provision/json/rejected`
}

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
    const client = new awsMqtt.MqttClient(clientBootstrap);
    const connection = client.new_connection(config);
    const identity = new iotidentity.IotIdentityClient(connection);
    await connection.connect();

    if (argv.csrFilePath) {
        // Csr workflow
        throw new Error("SCR workflow not support!")
    } else {
        // Keys workflow
        try {
            const { keysAndCertificateResponse } = await execute_provision_keys(identity, argv);
            const { thingResponse } = await execute_register_thing(identity, keysAndCertificateResponse.certificateOwnershipToken!, argv)
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

interface IExecPrivisionKeysResponse {
    keysAndCertificateResponse: iotidentity.model.CreateKeysAndCertificateResponse,
}

interface IExecRegisterThingResponse {
    thingResponse: iotidentity.model.RegisterThingResponse
}

async function execute_register_thing(identity: iotidentity.IotIdentityClient, certificateOwnershipToken: string, argv: Args): Promise<IExecRegisterThingResponse> {
    return new Promise(async (resolve, reject) => {
        let thing: iotidentity.model.RegisterThingResponse | null = null;

        function registerAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.RegisterThingResponse) {
            if (response) {
                console.log("RegisterThingResponse for thingName=" + response.thingName);
                thing = response
                done()
            } else if (error) {
                reject(error);
                return;
            }
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
            if (thing) {
                resolve({ thingResponse: thing })
                return;
            } else {
                reject(new Error(`thing is null or undefined, ${{ thing }}`))
                return;
            }
        }

        console.log("Subscribing to RegisterThing Accepted and Rejected topics..");
        const registerThingSubRequest: iotidentity.model.RegisterThingSubscriptionRequest = { templateName: argv.templateName };
        await identity.subscribeToRegisterThingAccepted(
            registerThingSubRequest,
            awsMqtt.QoS.AtLeastOnce,
            (error, response) => registerAccepted(error, response));

        await identity.subscribeToRegisterThingRejected(
            registerThingSubRequest,
            awsMqtt.QoS.AtLeastOnce,
            (error, response) => registerRejected(error, response));

        console.log("Publishing to RegisterThing topic..");

        const map: { [key: string]: string } = JSON.parse(argv.templateParameters || "{}");


        if (certificateOwnershipToken === null) {
            throw new Error("certificateOwnershipToken is null")
        }

        const registerThingRequestPayload: iotidentity.model.RegisterThingRequest =
            { parameters: map, templateName: argv.templateName, certificateOwnershipToken };

        await identity.publishRegisterThing(
            registerThingRequestPayload,
            awsMqtt.QoS.AtLeastOnce);

    })
}


async function execute_provision_keys(identity: iotidentity.IotIdentityClient, argv: Args): Promise<IExecPrivisionKeysResponse> {
    return new Promise(async (resolve, reject) => {
        try {
            let certificateOwnershipToken: string | null = null;
            let keysAndCertificate: iotidentity.model.CreateKeysAndCertificateResponse | null = null;

            function keysAccepted(error?: iotidentity.IotIdentityError, response?: iotidentity.model.CreateKeysAndCertificateResponse) {
                if (response) {
                    console.log("CreateKeysAndCertificateResponse for certificateId=" + response.certificateId);
                    // console.log("CreateKeysAndCertificateResponse for certificateOwnershipToken=" + response.certificateOwnershipToken);
                    // console.log("CreateKeysAndCertificateResponse payload=" + response);

                    if (response.certificateOwnershipToken && response.certificatePem && response.privateKey) {
                        certificateOwnershipToken = response.certificateOwnershipToken;
                        keysAndCertificate = response
                    }

                    done()
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

            function done() {
                if (keysAndCertificate) {
                    resolve({ keysAndCertificateResponse: keysAndCertificate })
                    return;
                } else {
                    reject(new Error(`keysAndCertificate is null or undefined, ${{ keysAndCertificate }}`))
                    return;
                }
            }

            console.log("Subscribing to CreateKeysAndCertificate Accepted and Rejected topics..");

            const keysSubRequest: iotidentity.model.CreateKeysAndCertificateSubscriptionRequest = {};

            await identity.subscribeToCreateKeysAndCertificateAccepted(
                keysSubRequest,
                awsMqtt.QoS.AtLeastOnce,
                (error, response) => keysAccepted(error, response));

            await identity.subscribeToCreateKeysAndCertificateRejected(
                keysSubRequest,
                awsMqtt.QoS.AtLeastOnce,
                (error, response) => keysRejected(error, response));

            console.log("Publishing to CreateKeysAndCertificate topic..");
            const keysRequest: iotidentity.model.CreateKeysAndCertificateRequest = { toJSON() { return {}; } };

            await identity.publishCreateKeysAndCertificate(
                keysRequest,
                awsMqtt.QoS.AtLeastOnce);


        } catch (err) {

            reject(err);
            return

        }
    });
}