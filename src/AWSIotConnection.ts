import { mqtt, auth, http, io, iot } from 'aws-crt';
import { TextDecoder } from 'util';

export interface IGetConnectionProps {
    certPath: string;
    keyPath: string;
    clientId: string;
    endpoint: string;
    topic: string;

    verbose?: string;
    verbosity: io.LogLevel
    useWebsocket?: boolean;
    proxyHost?: string;
    proxyPort?: number;
    signingRegion?: string;
    caFilePath?: string;
    csrFilePath?: string;
}

export async function getConnection(argv: IGetConnectionProps): Promise<mqtt.MqttClientConnection> {
    if (argv.verbose != 'none') {
        const level: io.LogLevel = parseInt(io.LogLevel[argv.verbosity]);
        io.enable_logging(level);
    }

    const client_bootstrap = new io.ClientBootstrap();

    let config_builder = null;
    if (argv.useWebsocket) {
        let proxy_options = undefined;
        if (argv.proxyHost && argv.proxyPort !== undefined) {
            proxy_options = new http.HttpProxyOptions(argv.proxyHost, argv.proxyPort);
        }

        if (!argv.signingRegion) {
            throw new Error("argv.signing_region undefined")
        }

        config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
            region: argv.signingRegion,
            credentials_provider: auth.AwsCredentialsProvider.newDefault(client_bootstrap),
            proxy_options: proxy_options
        });
    } else {
        config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(argv.certPath, argv.keyPath);
    }

    if (argv.caFilePath != null) {
        config_builder.with_certificate_authority_from_path(undefined, argv.caFilePath);
    }

    config_builder.with_clean_session(false);
    config_builder.with_client_id(argv.clientId);
    config_builder.with_endpoint(argv.endpoint);

    // force node to wait 60 seconds before killing itself, promises do not keep node alive
    // const timer = setTimeout(() => { }, 60 * 1000);

    const config = config_builder.build();
    const client = new mqtt.MqttClient(client_bootstrap);
    const connection = client.new_connection(config);

    await connection.connect()

    return connection
}

// async function execute_session(connection: mqtt.MqttClientConnection, argv: IPubSubProps) {
//     const { count = 0, topic, message} = argv
//     return new Promise(async (resolve, reject) => {
//         try {
//             const decoder = new TextDecoder('utf8');
//             const on_receive = async (_topic: string, payload: ArrayBuffer) => {
//                 const json = decoder.decode(payload);
//                 console.log(`Publish received on topic ${_topic}`);
//                 console.log(json);
//                 const receive_message = JSON.parse(json);
//                 if (receive_message.sequence == count) {
//                     resolve();
//                 }
//             }

//             await connection.subscribe(topic, mqtt.QoS.AtLeastOnce, on_receive);

//             for (let op_idx = 0; op_idx < count; ++op_idx) {
//                 const publish = async () => {
//                     const msg = {
//                         message,
//                         sequence: op_idx + 1,
//                     };
//                     const json = JSON.stringify(msg);
//                     connection.publish(topic, json, mqtt.QoS.AtLeastOnce);
//                 }
//                 setTimeout(publish, op_idx * 1000);
//             }
//         }
//         catch (error) {
//             reject(error);
//         }
//     });
// }