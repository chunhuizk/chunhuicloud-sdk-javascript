import fs = require('fs');
import * as AWSIotFleetProvision from './AWSIotFleetProvision'
import * as AWSIotConnection from './AWSIotConnection'
import { device } from 'aws-iot-device-sdk';
import { GatewayDevice } from '.';

export interface IIotHubConfig {
    debug?: boolean;
    isProvision?: boolean;
    isRotation?: boolean;
    provisionCertPath?: string;
    provisionKeyPath?: string;
    provisionTemplateName?: string;
    certPath: string;
    keyPath: string;
    rootCaPath: string;
    endpoint: string;
    device: GatewayDevice.Types.IGatewayDeviceProp
}

class IotHub {
    debug: boolean;
    device: GatewayDevice.Types.IGatewayDeviceProp;
    provisionCertPath?: string;
    provisionKeyPath?: string;
    provisionTemplateName?: string;
    certPath: string;
    keyPath: string;
    rootCaPath: string;
    isProvision: boolean;
    isRotation: boolean;
    endpoint: string;

    deviceConnection?: device;

    // clientIdPrefix = "SCADA_GATEWAY_"

    constructor(config: IIotHubConfig) {
        const {
            debug = false,
            isProvision = false,
            isRotation = false,
            // endpoint = "a3l4n6ns1853l2-ats.iot.us-east-1.amazonaws.com"
        } = config;

        this.device = config.device;
        this.certPath = config.certPath;
        this.keyPath = config.keyPath;
        this.rootCaPath = config.rootCaPath;
        this.provisionCertPath = config.provisionCertPath
        this.provisionKeyPath = config.provisionKeyPath
        this.provisionTemplateName = config.provisionTemplateName
        this.endpoint = config.endpoint
        this.debug = debug;
        this.isProvision = isProvision;
        this.isRotation = isRotation;

        this.configure()
    }

    configure() {
        const rootCACertFileExist = fs.existsSync(this.rootCaPath);

        if (!rootCACertFileExist) {
            throw new Error("Missing Root Certificate")
        }

        // Check if the device need to provision based on wither mainCertFile exist
        if (this.isProvision === false) {
            try {
                const mainCertFileExist = fs.existsSync(this.certPath);
                const mainKeyFileExist = fs.existsSync(this.keyPath);

                if (!mainCertFileExist && !mainKeyFileExist) {
                    // NoMainProvisionFile
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

    async connect(): Promise<device> {
        try {
            if (this.isProvision) {
                await this.provision()
            }

            const deviceConnection = await this.getConnection()

            this.deviceConnection = deviceConnection

            return deviceConnection
        } catch (err) {
            if (err.name === 'ProvisionFailedError') {
                console.error('ERROR: Provision Failed')
            }
            throw err
        }
    }

    private async getConnection(): Promise<device> {
        const input: AWSIotConnection.IGetConnectionProps = {
            certPath: this.certPath,
            keyPath: this.keyPath,
            rootCaPath: this.rootCaPath,
            clientId: this.getClientId(),
            endpoint: this.endpoint
        }

        return await AWSIotConnection.getDevice(input)
    }

    getClientId(): string {
        return `${this.device.Model}_${this.device.SerialNumber}`
    }

    getDefaultSubcribeTopicName(): string {
        return `scada/gateway/client/${this.getClientId()}`
    }

    async provision(): Promise<void> {
        if (!this.provisionCertPath || !this.provisionKeyPath) {
            throw new Error("provisonCertPath or provisionKeyPath not exist")
        }

        if (!this.provisionTemplateName) {
            throw new Error("provisionTemplateName not exist")
        }

        const input: AWSIotFleetProvision.IExecProvisionProps = {
            verbose: !this.debug ? 'none' : undefined,
            verbosity: 3,
            provisionCertPath: this.provisionCertPath,
            provisionKeyPath: this.provisionKeyPath,
            grantCertPath: this.certPath,
            grantKeyPath: this.keyPath,
            clientId: this.getClientId(),
            endpoint: this.endpoint,
            templateName: this.provisionTemplateName,
            templateParameters: JSON.stringify({
                Model: this.device.Model,
                SerialNumber: this.device.SerialNumber
            })
        }

        try {
            await AWSIotFleetProvision.execProvision(input)
        } catch (err) {
            if (err instanceof Error) {
                err.name = "ProvisionFailedError"
            } else {
                err = new Error(err)
                err.name = "ProvisionFailedError"
            }
            throw err
        }
    }
}

export default IotHub