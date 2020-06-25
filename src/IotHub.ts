const fs = require('fs').promises;
import * as AWSIotFleetProvision from './AWSIotFleetProvision'
import * as AWSIotConnection from './AWSIotConnection'

export interface IIotHubConfig {
    isProvision?: boolean;
    isRotation?: boolean;
    provisionCertPath?: string;
    provisionKeyPath?: string;
    provisionTemplateName?: string;
    certPath: string;
    keyPath: string;
    endpoint?: string;
    deviceId: string;
}

class IotHub {
    deviceId: string;
    provisionCertPath?: string;
    provisionKeyPath?: string;
    provisionTemplateName: string;
    certPath: string;
    keyPath: string;
    isProvision: boolean;
    isRotation: boolean;
    endpoint: string;

    constructor(config: IIotHubConfig) {
        const {
            isProvision = false,
            isRotation = false,
            endpoint = "a3l4n6ns1853l2-ats.iot.us-east-1.amazonaws.com",
            provisionTemplateName = "Chunhuizk-Scada-Gateway-Provision"
        } = config;

        this.deviceId = config.deviceId;
        this.certPath = config.certPath;
        this.keyPath = config.keyPath;
        this.provisionCertPath = config.provisionCertPath
        this.provisionKeyPath = config.provisionKeyPath
        this.provisionTemplateName = provisionTemplateName
        this.isProvision = isProvision;
        this.isRotation = isRotation;
        this.endpoint = endpoint

        this.configure()
    }

    configure() {
        // Check if the device need to provision based on wither mainCertFile exist
        if (this.isProvision === false) {
            // const certPathFileName = path.basename(this.certPath)
            // const certFolderCertFilePath = path.join(this.certFolderPath, certPathFileName)
            try {
                const mainCertFileExist = fs.existsSync(this.certPath);
                const mainKeyFileExist = fs.existsSync(this.keyPath);

                if (!mainCertFileExist && !mainKeyFileExist) {
                    //NoMainProvisionFile
                    if (this.provisionCertPath && this.provisionKeyPath) {
                        const provisionCertFileExist = fs.existsSync(this.provisionCertPath);
                        const provisionKeyFileExist = fs.existsSync(this.provisionKeyPath);

                        if (!provisionCertFileExist || !provisionKeyFileExist) {
                            throw new Error("ProvisionCertFile or ProvisionKeyFile not exist")
                        }

                        this.isProvision = true
                    } else {
                        throw new Error("Need certFile or provisionCertFile to start provision process")
                    }
                } else {
                    if (!mainCertFileExist || !mainKeyFileExist) {
                        throw new Error("Need certFile or certKeyFile")
                    }
                    // Good To Go Online
                }

            } catch (e) {
                console.log('Error reading certFolderCertFile:', e.stack);
            }
        }
    }

    setEndpoint(endpoint: string) {
        this.endpoint = endpoint
    }

    async connect(topic: string) {
        try {
            if (this.isProvision) {
                await this.provision()
            }
            return await this.connectToTopic(topic)

        } catch (err) {
            throw err
        }
    }

    async connectToTopic(topic: string) {
        const input: AWSIotConnection.IGetConnectionProps = {
            verbosity: 3,
            certPath: this.certPath,
            keyPath: this.keyPath,
            clientId: this.deviceId,
            endpoint: this.endpoint,
            topic
        }
        const conn = await AWSIotConnection.getConnection(input)
    }

    async provision() {
        const input: AWSIotFleetProvision.IExecProvisionProps = {
            verbosity: 3,
            provisionCertPath: this.certPath,
            provisionKeyPath: this.keyPath,
            clientId: this.deviceId,
            endpoint: this.endpoint,
            templateName: "Chunhuizk-Scada-Gateway-Provision",
            templateParameters: JSON.stringify({
                SerialNumber: this.deviceId
            })
        }

        try {
            await AWSIotFleetProvision.execProvision(input)
        } catch (err) {
            throw err
        }
    }
}

export default IotHub