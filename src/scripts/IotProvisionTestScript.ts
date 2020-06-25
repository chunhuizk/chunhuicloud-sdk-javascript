import path = require("path")
import fs = require("fs")
import { IIotHubConfig, IotHub, getAWSRootCertificatePath } from ".."
import { exit } from "process"
import { mqtt } from "aws-iot-device-sdk-v2"

const provisionCertFilesFolderPath = path.join(process.cwd(), 'test_provision_cert_files')
if (!fs.existsSync(provisionCertFilesFolderPath)) {
    console.log("SKIP, provisionCertFilesFolderPath not exist")
    exit()
}

console.log("PROCEED")

const config: IIotHubConfig = {
    deviceId: 'test-id',
    certPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'),
    keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'),
    rootCaPath: getAWSRootCertificatePath(),
    provisionCertPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-certificate.pem.crt'),
    provisionKeyPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-private.pem.key'),
}
const newIotHub = new IotHub(config)

try {
    const topicName = 'iot/test'
    newIotHub.connect().then(async (device) => {
        device
            .on('connect', function () {
                console.log('connect');
                // device.subscribe(topicName);
                // device.publish(topicName, JSON.stringify({ test_data: 1 }));
            });

        device
            .on('message', function (topic, payload) {
                console.log('message', topic, payload.toString());
            });

        device
            .on('close', function () {
                console.log('close');
            });

        device
            .on('reconnect', function () {
                console.log('reconnect');
            });
        device
            .on('offline', function () {
                console.log('offline');
            });
        device
            .on('error', function (error) {
                console.log('error', error);
            });

        device.subscribe(topicName);

    }).catch((err) => {
        throw err
    })
} catch (err) {
    throw err
}