import path = require("path")
import fs = require("fs")
import { IIotHubConfig, IotHub, getAWSRootCertificatePath, Endpoint } from ".."
import { exit } from "process"

const provisionCertFilesFolderPath = path.join(process.cwd(), 'test_provision_cert_files')
if (!fs.existsSync(provisionCertFilesFolderPath)) {
    console.log("SKIP, provisionCertFilesFolderPath not exist")
    exit()
}
const testEndpoint = Endpoint.IotHub.Virginia
const serialNumber = 'test-id'

const config: IIotHubConfig = {
    endpoint: testEndpoint,
    device: {
        Model: "Test",
        SerialNumber: serialNumber
    },
    certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
    keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
    rootCaPath: getAWSRootCertificatePath(),
    provisionCertPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-certificate.pem.crt'),
    provisionKeyPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-private.pem.key'),
    provisionTemplateName: "CHUNHUIZK_SCADA_PROVISION_V1"
}
const newIotHub = new IotHub(config)

try {
    const topicName = `scada/gateway/client/${newIotHub.getClientId()}`
    newIotHub.connect().then(async (device) => {
        device.subscribe(topicName);

        device
            .on('connect', () => {
                console.log('connect');
                device.subscribe(topicName);
                device.publish(topicName, JSON.stringify({ test_data: 1 }));
            });

        device
            .on('message', (topic, payload) => {
                console.log('message', topic, payload.toString());
            });

        device
            .on('close', () => {
                console.log('close');
            });

        device
            .on('reconnect', () => {
                console.log('reconnect');
            });
        device
            .on('offline', () => {
                console.log('offline');
            });
        device
            .on('error', (error) => {
                console.log('error', error);
            });
    }).catch((err) => {
        throw err
    })
} catch (err) {
    throw err
}