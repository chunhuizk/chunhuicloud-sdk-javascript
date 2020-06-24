import * as fs from 'fs'
import * as path from 'path'

interface IIotHubConfig {
    isProvision?: boolean;
    isRotation?: boolean;
    certFolderPath: string;
    certPath: string;
    keyPath: string;
    endpoint?: string;
    deviceId: string;
}

class IotHub {
    deviceId: string;
    certFolderPath: string;
    certPath: string;
    keyPath: string;
    isProvision: boolean;
    isRotation: boolean;
    endpoint: string;

    constructor(config: IIotHubConfig) {
        const { isProvision = false,
            isRotation = false,
            endpoint = "a3l4n6ns1853l2-ats.iot.us-east-1.amazonaws.com" } = config;

        this.deviceId = config.deviceId;
        this.certPath = config.certPath;
        this.keyPath = config.keyPath;
        this.certFolderPath = config.certFolderPath
        this.isProvision = isProvision;
        this.isRotation = isRotation;
        this.endpoint = endpoint

        this.configure()
    }

    configure() {
        // Check if the device need to provision based on wither mainCertFile exist
        if (this.isProvision === false) {
            const certPathFileName = path.basename(this.certPath)
            const certFolderCertFilePath = path.join(this.certFolderPath, certPathFileName)
            try {
                const mainCertFileExist = fs.existsSync(certFolderCertFilePath);

                if (!mainCertFileExist) {
                    console.log('NEED PROVISION!')
                    this.isProvision = true
                }
            } catch (e) {
                console.log('Error reading certFolderCertFile:', e.stack);
            }
        }
    }

    setEndpoint(endpoint: string) {
        this.endpoint = endpoint
    }

    async connect() {
        if (this.isProvision) {
            return this.provision()
        }
    }

    async provision() {

    }
}

export default IotHub