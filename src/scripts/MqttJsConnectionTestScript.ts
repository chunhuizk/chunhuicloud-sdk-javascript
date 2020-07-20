import { getAWSRootCertificatePath, Endpoint } from ".."

import { connect, IClientOptions } from 'mqtt'
var fs = require('fs')
var path = require('path')
var KEY = fs.readFileSync(path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'certificate.pem.crt'))
var CERT = fs.readFileSync(path.join(process.cwd(), 'test_provision_cert_files', 'provinsioned_certs', 'private.pem.key'))
var TRUSTED_CA_LIST = fs.readFileSync(getAWSRootCertificatePath())

var PORT = 8883
var HOST = Endpoint.IotHub.Ningxia

var options:IClientOptions = {
    port: PORT,
    host: HOST,
    key: KEY,
    cert: CERT,
    rejectUnauthorized: true,
    ca: TRUSTED_CA_LIST,
    protocol: 'mqtts'
}

var client = connect(undefined, options)

client.subscribe('messages')
client.publish('messages', 'Current time is: ' + new Date())
client.on('message', function (topic: string, message: any) {
    console.log(message)
})

client.on('connect', function () {
    console.log('Connected')
})