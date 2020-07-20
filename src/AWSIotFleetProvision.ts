import { device, DeviceOptions } from 'aws-iot-device-sdk'
import fs = require('fs');

export const AWS_IOT_PROVISION_TOPICS = {
    createCertificaties: "$aws/certificates/create/json",
    createCertificatiesAccepted: "$aws/certificates/create/json/accepted",
    createCertificatiesRejected: "$aws/certificates/create/json/rejected",
    registerThing: (templateName: string) => `$aws/provisioning-templates/${templateName}/provision/json`,
    registerThingAccepted: (templateName: string) => `$aws/provisioning-templates/${templateName}/provision/json/accepted`,
    registerThingRejected: (templateName: string) => `$aws/provisioning-templates/${templateName}/provision/json/rejected`
}

export interface AWSCreateKeysAndCertificateResponse {
    certificateId?: string;
    certificateOwnershipToken?: string;
    certificatePem?: string;
    privateKey?: string;
}

export interface AWSIotRegisterThingResponse {
    thingName?: string;
    deviceConfiguration?: {
        [key: string]: string;
    };
}

export interface AWSErrorResponse {
    statusCode?: number;
    errorMessage?: string;
    errorCode?: string;
}

export interface AWSRegisterThingRequest {
    templateName: string;
    parameters?: {
        [key: string]: string;
    };
    certificateOwnershipToken?: string;
}

export interface IExecProvisionProps {
    provisionCertPath: string;
    provisionKeyPath: string;
    grantCertPath: string;
    grantKeyPath: string;
    caFilePath: string;
    clientId: string;
    endpoint: string;
    templateName: string;
    templateParameters?: string;

    verbose?: string;
    verbosity?: number;
    useWebsocket?: boolean;
    signingRegion?: string;
    proxyHost?: string;
    proxyPort?: number;
    csrFilePath?: string;
}

type Args = IExecProvisionProps;

export async function execProvision(argv: Args): Promise<void> {

    const provisionDeviceOption: DeviceOptions = {
        certPath: argv.provisionCertPath,
        keyPath: argv.provisionKeyPath,
        caPath: argv.caFilePath,
        clientId: argv.clientId,
        host: argv.endpoint,
    }
    const provisionDevice = new device(provisionDeviceOption)

    try {
        const { keysAndCertificateResponse } = await execute_provision_keys(provisionDevice, argv);
        const { thingResponse } = await execute_register_thing(provisionDevice, keysAndCertificateResponse.certificateOwnershipToken!, argv)
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

        await new Promise((resolve, reject) => {
            provisionDevice.end(undefined, () => {
                resolve()
            })
        })

        console.log("Provision SUCCESS");

        return Promise.resolve()

    } catch (err) {
        return Promise.reject(err)
    }


}

interface IExecPrivisionKeysResponse {
    keysAndCertificateResponse: AWSCreateKeysAndCertificateResponse,
}

interface IExecRegisterThingResponse {
    thingResponse: AWSIotRegisterThingResponse
}

async function execute_register_thing(provisionDevice: device, certificateOwnershipToken: string, argv: Args): Promise<IExecRegisterThingResponse> {
    const decoder = new TextDecoder('utf-8');

    return new Promise(async (resolve, reject) => {
        let thing: AWSIotRegisterThingResponse | null = null;

        provisionDevice.on('message', (topic: string, payload: any) => {
            const data = JSON.parse(decoder.decode(payload))

            if (topic === AWS_IOT_PROVISION_TOPICS.registerThingAccepted(argv.templateName)) {
                registerAccepted(data)
            }

            if (topic === AWS_IOT_PROVISION_TOPICS.registerThingRejected(argv.templateName)) {
                registerRejected(data)
            }
        })

        function registerAccepted(response: AWSIotRegisterThingResponse) {
            console.log("RegisterThingResponse for thingName=" + response.thingName);
            thing = response
            done()
        }

        function registerRejected(response: AWSErrorResponse) {
            console.error("RegisterThing ErrorResponse for " +
                "statusCode=:" + response.statusCode +
                "errorCode=:" + response.errorCode +
                "errorMessage=:" + response.errorMessage);

            reject(response);
            return;
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

        await new Promise((resolve, reject) => {
            provisionDevice.subscribe(AWS_IOT_PROVISION_TOPICS.registerThingAccepted(argv.templateName), { qos: 1 }, (err) => {
                if (err) { reject(err); return; }
                console.log('AWS_IOT_PROVISION_TOPICS.registerThingAccepted', 'SUBCRIBED!')
                resolve()
                return
            })
        })

        await new Promise((resolve, reject) => {
            provisionDevice.subscribe(AWS_IOT_PROVISION_TOPICS.registerThingRejected(argv.templateName), { qos: 1 }, (err) => {
                if (err) { reject(err); return; }
                console.log('AWS_IOT_PROVISION_TOPICS.registerThingRejected', 'SUBCRIBED!')
                resolve()
                return
            })
        })


        console.log("Publishing to RegisterThing topic..");

        const map: { [key: string]: string } = JSON.parse(argv.templateParameters || "{}");


        if (certificateOwnershipToken === null) {
            throw new Error("certificateOwnershipToken is null")
        }

        const registerThingRequestPayload: AWSRegisterThingRequest =
            { parameters: map, templateName: argv.templateName, certificateOwnershipToken };

        await new Promise((resolve, reject) => {
            provisionDevice.publish(AWS_IOT_PROVISION_TOPICS.registerThing(registerThingRequestPayload.templateName), JSON.stringify(registerThingRequestPayload), { qos: 1 }, (err) => {
                if (err) { reject(err); return; }
                console.log('AWS_IOT_PROVISION_TOPICS.registerThing', 'PUBLISHED!')
                resolve()
                return
            })
        })


    })
}


async function execute_provision_keys(provisionDevice: device, argv: Args): Promise<IExecPrivisionKeysResponse> {
    const decoder = new TextDecoder('utf-8');

    return new Promise(async (resolve, reject) => {
        try {
            let keysAndCertificate: AWSCreateKeysAndCertificateResponse | null = null;

            provisionDevice.on('message', (topic: string, payload: any) => {
                const data = JSON.parse(decoder.decode(payload))
                if (topic === AWS_IOT_PROVISION_TOPICS.createCertificatiesAccepted) {
                    keysAccepted(data)
                }

                if (topic === AWS_IOT_PROVISION_TOPICS.createCertificatiesRejected) {
                    keysRejected(data)
                }
            })

            function keysAccepted(response: AWSCreateKeysAndCertificateResponse) {
                console.log("CreateKeysAndCertificateResponse for certificateId=" + response.certificateId);

                if (response.certificateOwnershipToken && response.certificatePem && response.privateKey) {
                    keysAndCertificate = response
                } else {
                    throw new Error("Missing Data")
                }

                done()
            }

            function keysRejected(response: AWSErrorResponse) {
                console.error(response)
                reject(response);
                return;
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

            await new Promise((resolve, reject) => {
                provisionDevice.subscribe(AWS_IOT_PROVISION_TOPICS.createCertificatiesAccepted, { qos: 1 }, (err) => {
                    if (err) { reject(err); return; }
                    console.log('AWS_IOT_PROVISION_TOPICS.createCertificatiesAccepted', 'SUBCRIBED!')
                    resolve()
                    return
                })
            })

            await new Promise((resolve, reject) => {
                provisionDevice.subscribe(AWS_IOT_PROVISION_TOPICS.createCertificatiesRejected, { qos: 1 }, (err) => {
                    if (err) { reject(err); return; }
                    console.log('AWS_IOT_PROVISION_TOPICS.createCertificatiesRejected', 'SUBCRIBED!')
                    resolve()
                    return
                })
            })


            console.log("Publishing to CreateKeysAndCertificate topic..");

            await new Promise((resolve, reject) => {
                provisionDevice.publish(AWS_IOT_PROVISION_TOPICS.createCertificaties, JSON.stringify({}), { qos: 1 }, (err) => {
                    if (err) { reject(err); return; }
                    console.log('AWS_IOT_PROVISION_TOPICS.createCertificaties', 'PUBLISHED!')
                    resolve()
                    return
                })
            })

        } catch (err) {

            reject(err);
            return

        }
    });
}