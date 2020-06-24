import * as fs from 'fs'
import * as path from 'path'
import * as AWSIotFleetProvision from './AWSIotFleetProvision'

export interface IIotHubConfig {
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
        try {
            if (this.isProvision) {
                await this.provision()
            }
        } catch (err) {
            throw err
        }
    }

    async provision() {
        const input: AWSIotFleetProvision.IExecProvisionProps = {
            verbosity: 3,
            cert: this.certPath,
            key: this.keyPath,
            client_id: this.deviceId,
            endpoint: this.endpoint,
            template_name: "Chunhuizk-Scada-Gateway-Provision"
        }
        try {
            await AWSIotFleetProvision.execProvision(input)
        } catch (err) {
            throw err
        }
    }
}

export default IotHub