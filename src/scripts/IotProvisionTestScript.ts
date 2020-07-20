import path = require("path")
import fs = require("fs")
import { IIotHubConfig, IotHub, getAWSRootCertificatePath, Endpoint } from "../index"
import { exit } from "process"

const provisionCertFilesFolderPath = path.join(process.cwd(), 'test_provision_cert_files')
if (!fs.existsSync(provisionCertFilesFolderPath)) {
    console.log("SKIP, provisionCertFilesFolderPath not exist")
    exit()
}
const ENDPOINT = Endpoint.IotHub.Ningxia
const PROVISION_TEMPLATE_NAME = "Chunhuizk-DARU-Gateway-Provision-v1"
const SERIAL_NUMBER = 'test-id'
const MODEL_NAME = 'Test'

const config: IIotHubConfig = {
    endpoint: ENDPOINT,
    device: {
        Model: MODEL_NAME,
        SerialNumber: SERIAL_NUMBER
    },
    certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
    keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
    rootCaPath: getAWSRootCertificatePath(),
    provisionCertPath: path.join(process.cwd(), 'test_provision_cert_files', '1b9652cee2-certificate.pem.crt'),
    provisionKeyPath: path.join(process.cwd(), 'test_provision_cert_files', '1b9652cee2-private.pem.key'),
    provisionTemplateName: PROVISION_TEMPLATE_NAME
}
const newIotHub = new IotHub(config)

try {
    const topicName = newIotHub.getDefaultSubcribeTopicName()
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