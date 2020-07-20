import path = require("path")
import fs = require("fs")
import { IIotHubConfig, IotHub, getAWSRootCertificatePath, Endpoint } from "../index"
import { exit } from "process"
import { QoS } from "aws-crt/dist/common/mqtt"

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
    newIotHub.connect().then(async (mqttConnection) => {
        console.log('connection get')

        mqttConnection.subscribe(topicName, QoS.AtLeastOnce, (topic: string, payload: any) => {
            var enc = new TextDecoder("utf-8");
            console.log('message:', enc.decode(payload))
        });

        mqttConnection.publish(topicName, { hello: 'world' }, QoS.AtLeastOnce)

    }).catch((err) => {
        throw err
    })
} catch (err) {
    throw err
}