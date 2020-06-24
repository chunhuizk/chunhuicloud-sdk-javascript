import path = require("path")
import fs = require("fs")
import { IIotHubConfig, IotHub } from ".."

(async function(){
    const provisionCertFilesFolderPath = path.join(process.cwd(), 'test_provision_cert_files')
    if (!fs.existsSync(provisionCertFilesFolderPath)) {
        console.log("SKIP, provisionCertFilesFolderPath not exist")
        return
    }

    const config: IIotHubConfig = {
        deviceId: 'test-id',
        certFolderPath: path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs'),
        certPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-certificate.pem.crt'),
        keyPath: path.join(process.cwd(), 'test_provision_cert_files', 'd36d6a6096-private.pem.key'),
    }
    const newIotHub = new IotHub(config)

    try {
        newIotHub.connect()
    } catch (err) {
        throw err
    }
})()