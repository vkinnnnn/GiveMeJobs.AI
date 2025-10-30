const vscode = require('vscode')
const keywords = /(systemLog|processManagement|net|security|setParameter|storage|operationProfiling|replication|sharding|auditLog|snmp).*?:/i
const completionItems = [
    { label: 'systemLog:', description: 'Core Options' },
    { label: 'processManagement:', description: 'Core Options' },
    { label: 'cloud:', description: 'Core Options' },
    { label: 'net:', description: 'Core Options' },
    { label: 'security:', description: 'Core Options' },
    { label: 'setParameter:', description: 'Core Options' },
    { label: 'storage:', description: 'Core Options' },
    { label: 'operationProfiling:', description: 'Core Options' },
    { label: 'replication:', description: 'Core Options' },
    { label: 'sharding:', description: 'Core Options' },
    { label: 'auditLog:', description: 'Core Options' },
    { label: 'snmp:', description: 'Core Options' },

    // systemLog
    { label: 'verbosity:', detail: '<int>', description: 'systemLog Options' },
    { label: 'quiet:', detail: '<boolean>', description: 'systemLog Options' },
    { label: 'traceAllExceptions:', detail: '<boolean>', description: 'systemLog Options' },
    { label: 'syslogFacility:', detail: '<string>', description: 'systemLog Options' },
    { label: 'path:', detail: '<string>', description: 'systemLog Options' },
    { label: 'logAppend:', detail: '<boolean>', description: 'systemLog Options' },
    { label: 'logRotate:', detail: '<string>', description: 'systemLog Options' },
    { label: 'destination:', detail: '<string>', description: 'systemLog Options' },
    { label: 'timeStampFormat:', detail: '<string>', description: 'systemLog Options' },
    { label: 'component:', description: 'systemLog Options' },

    // processManagement
    { label: 'fork:', detail: '<boolean>', description: 'processManagement Options' },
    { label: 'pidFilePath:', detail: '<string>', description: 'processManagement Options' },
    { label: 'timeZoneInfo:', detail: '<string>', description: 'processManagement Options' },
    { label: 'windowsService:', description: 'processManagement Options' },

    // cloud
    { label: 'monitoring:', description: 'cloud Options' },

    // net
    { label: 'port:', detail: '<int>', description: 'net Options' },
    { label: 'bindIp:', detail: '<string>', description: 'net Options' },
    { label: 'bindIpAll:', detail: '<boolean>', description: 'net Options' },
    { label: 'maxIncomingConnections:', detail: '<int>', description: 'net Options' },
    { label: 'wireObjectCheck:', detail: '<boolean>', description: 'net Options' },
    { label: 'ipv6:', detail: '<boolean>', description: 'net Options' },
    { label: 'port:', detail: '<int>', description: 'net Options' },
    { label: 'unixDomainSocket:', description: 'net Options' },
    { label: 'tls:', description: 'net Options' },
    { label: 'compression:', description: 'net Options' },

    // security
    { label: 'keyFile:', detail: '<int>', description: 'security Options' },
    { label: 'clusterAuthMode:', detail: '<string>', description: 'security Options' },
    { label: 'authorization:', detail: '<string>', description: 'security Options' },
    { label: 'transitionToAuth:', detail: '<boolean>', description: 'security Options' },
    { label: 'javascriptEnabled:', detail: '<boolean>', description: 'security Options' },
    { label: 'redactClientLogData:', detail: '<boolean>', description: 'security Options' },
    { label: 'enableEncryption:', detail: '<boolean>', description: 'security Options' },
    { label: 'encryptionCipherMode:', detail: '<string>', description: 'security Options' },
    { label: 'encryptionKeyFile:', detail: '<string>', description: 'security Options' },
    { label: 'clusterIpSourceAllowlist:', description: 'security Options' },
    { label: 'sasl:', description: 'security Options' },
    { label: 'kmip:', description: 'security Options' },
    { label: 'ldap:', description: 'security Options' },

    // setParameter
    { label: 'enableLocalhostAuthBypass:', detail: '<boolean>', description: 'setParameter Options' },

    // storage
    { label: 'dbPath:', detail: '<string>', description: 'storage Options' },
    { label: 'directoryPerDB:', detail: '<boolean>', description: 'storage Options' },
    { label: 'syncPeriodSecs:', detail: '<int>', description: 'storage Options' },
    { label: 'engine:', detail: '<string>', description: 'storage Options' },
    { label: 'oplogMinRetentionHours:', detail: '<double>', description: 'storage Options' },
    { label: 'wiredTiger:', description: 'storage Options' },
    { label: 'inMemory:', description: 'storage Options' },

    // operationProfiling
    { label: 'mode:', detail: '<string>', description: 'operationProfiling Options' },
    { label: 'slowOpThresholdMs:', detail: '<int>', description: 'operationProfiling Options' },
    { label: 'slowOpSampleRate:', detail: '<double>', description: 'operationProfiling Options' },
    { label: 'filter:', detail: '<string>', description: 'operationProfiling Options' },

    // replication
    { label: 'oplogSizeMB:', detail: '<int>', description: 'replication Options' },
    { label: 'replSetName:', detail: '<string>', description: 'replication Options' },
    { label: 'enableMajorityReadConcern:', detail: '<boolean>', description: 'replication Options' },
    { label: 'localPingThresholdMs:', detail: '<int>', description: 'replication Options' },

    // sharding
    { label: 'clusterRole:', detail: '<string>', description: 'sharding Options' },
    { label: 'archiveMovedChunks:', detail: '<boolean>', description: 'sharding Options' },
    { label: 'configDB:', detail: '<string>', description: 'sharding Options' },

    // auditLog
    { label: 'destination:', detail: '<string>', description: 'auditLog Options' },
    { label: 'format:', detail: '<string>', description: 'auditLog Options' },
    { label: 'path:', detail: '<string>', description: 'auditLog Options' },
    { label: 'filter:', detail: '<string>', description: 'auditLog Options' },

    // snmp
    { label: 'disabled:', detail: '<boolean>', description: 'snmp Options' },
    { label: 'subagent:', detail: '<boolean>', description: 'snmp Options' },
    { label: 'master:', detail: '<boolean>', description: 'snmp Options' },

    // global
    { label: 'accessControl:', description: 'Global Options' },
    { label: 'command:', description: 'Global Options' },
    { label: 'replication:', description: 'Global Options' },
    { label: 'election:', description: 'Global Options' },
    { label: 'heartbeats:', description: 'Global Options' },
    { label: 'initialSync:', description: 'Global Options' },
    { label: 'rollback:', description: 'Global Options' },
    { label: 'storage:', description: 'Global Options' },
    { label: 'journal:', description: 'Global Options' },
    { label: 'recovery:', description: 'Global Options' },
    { label: 'write:', description: 'Global Options' },
    { label: 'free:', description: 'Global Options' },
    { label: 'bind:', description: 'Global Options' },
    { label: 'authz:', description: 'Global Options' },
    { label: 'engineConfig:', description: 'Global Options' },
    { label: 'collectionConfig:', description: 'Global Options' },
    { label: 'indexConfig:', description: 'Global Options' },

    // global
    { label: 'verbosity:', detail: '<int>', description: 'Global Options' },
    { label: 'state:', detail: '<string>', description: 'Global Options' },
    { label: 'tags:', detail: '<string>', description: 'Global Options' },
    { label: 'enabled:', detail: '<boolean>', description: 'Global Options' },
    { label: 'pathPrefix:', detail: '<string>', description: 'Global Options' },
    { label: 'filePermissions:', detail: '<int>', description: 'Global Options' },
    { label: 'certificateSelector:', detail: '<string>', description: 'Global Options' },
    { label: 'clusterCertificateSelector:', detail: '<int>', description: 'Global Options' },
    { label: 'mode:', detail: '<string>', description: 'Global Options' },
    { label: 'certificateKeyFile:', detail: '<string>', description: 'Global Options' },
    { label: 'certificateKeyFilePassword:', detail: '<string>', description: 'Global Options' },
    { label: 'clusterFile:', detail: '<string>', description: 'Global Options' },
    { label: 'clusterPassword:', detail: '<string>', description: 'Global Options' },
    { label: 'CAFile:', detail: '<string>', description: 'Global Options' },
    { label: 'clusterCAFile:', detail: '<string>', description: 'Global Options' },
    { label: 'CRLFile:', detail: '<string>', description: 'Global Options' },
    { label: 'allowConnectionsWithoutCertificates:', detail: '<boolean>', description: 'Global Options' },
    { label: 'allowInvalidCertificates:', detail: '<boolean>', description: 'Global Options' },
    { label: 'allowInvalidHostnames:', detail: '<boolean>', description: 'Global Options' },
    { label: 'disabledProtocols:', detail: '<string>', description: 'Global Options' },
    { label: 'FIPSMode:', detail: '<boolean>', description: 'Global Options' },
    { label: 'logVersions:', detail: '<string>', description: 'Global Options' },
    { label: 'compressors:', detail: '<string>', description: 'Global Options' },
    { label: 'hostName:', detail: '<string>', description: 'Global Options' },
    { label: 'serviceName:', detail: '<string>', description: 'Global Options' },
    { label: 'displayName:', detail: '<string>', description: 'Global Options' },
    { label: 'description:', detail: '<string>', description: 'Global Options' },
    { label: 'serviceUser:', detail: '<string>', description: 'Global Options' },
    { label: 'servicePassword:', detail: '<string>', description: 'Global Options' },
    { label: 'saslauthdSocketPath:', detail: '<string>', description: 'Global Options' },
    { label: 'keyIdentifier:', detail: '<string>', description: 'Global Options' },
    { label: 'rotateMasterKey:', detail: '<boolean>', description: 'Global Options' },
    { label: 'serverName:', detail: '<string>', description: 'Global Options' },
    { label: 'port:', detail: '<string>', description: 'Global Options' },
    { label: 'clientCertificateFile:', detail: '<string>', description: 'Global Options' },
    { label: 'clientCertificatePassword:', detail: '<string>', description: 'Global Options' },
    { label: 'clientCertificateSelector:', detail: '<string>', description: 'Global Options' },
    { label: 'serverCAFile:', detail: '<string>', description: 'Global Options' },
    { label: 'connectRetries:', detail: '<int>', description: 'Global Options' },
    { label: 'connectTimeoutMS:', detail: '<int>', description: 'Global Options' },
    { label: 'servers:', detail: '<string>', description: 'Global Options' },
    { label: 'method:', detail: '<string>', description: 'Global Options' },
    { label: 'saslMechanisms:', detail: '<string>', description: 'Global Options' },
    { label: 'queryUser:', detail: '<string>', description: 'Global Options' },
    { label: 'queryPassword:', detail: '<string>', description: 'Global Options' },
    { label: 'useOSDefaults:', detail: '<string>', description: 'Global Options' },
    { label: 'transportSecurity:', detail: '<string>', description: 'Global Options' },
    { label: 'timeoutMS:', detail: '<int>', description: 'Global Options' },
    { label: 'userToDNMapping:', detail: '<string>', description: 'Global Options' },
    { label: 'queryTemplate:', detail: '<string>', description: 'Global Options' },
    { label: 'validateLDAPServerConfig:', detail: '<boolean>', description: 'Global Options' },
    { label: 'cacheSizeGB:', detail: '<number>', description: 'Global Options' },
    { label: 'journalCompressor:', detail: '<string>', description: 'Global Options' },
    { label: 'directoryForIndexes:', detail: '<boolean>', description: 'Global Options' },
    { label: 'maxCacheOverflowFileSizeGB:', detail: '<number>', description: 'Global Options' },
    { label: 'blockCompressor:', detail: '<string>', description: 'Global Options' },
    { label: 'prefixCompression:', detail: '<boolean>', description: 'Global Options' },
    { label: 'inMemorySizeGB:', detail: '<number>', description: 'Global Options' },
]

module.exports = {
    activate(context) {
        vscode.languages.registerDocumentFormattingEditProvider('mongod-config', {
            provideDocumentFormattingEdits(document) {
                let edits = []
                let tabLength = 0
                for (let line = 0; line < document.lineCount; line++) {
                    const lineObject = document.lineAt(line)
                    if (lineObject.isEmptyOrWhitespace || lineObject.text.trim().startsWith('#')) {
                        continue
                    }

                    const keywordsMatch = lineObject.text.match(keywords)
                    if (keywordsMatch) {
                        edits.push(vscode.TextEdit.replace(lineObject.range, keywordsMatch[1] + ':'))
                        tabLength = 1
                    } else {
                        const lineMatch = lineObject.text.match(/^(.*?):(.*)$/)
                        edits.push(vscode.TextEdit.replace(lineObject.range, String(' ').repeat(tabLength * 4) + lineMatch[1].trim() + ': ' + lineMatch[2].trim()))
                        tabLength = lineMatch[2].trim() ? 1 : tabLength + 1
                    }
                }

                return edits
            },
        })

        const provider = vscode.languages.registerCompletionItemProvider('mongod-config', {
            provideCompletionItems() {
                return completionItems.map(({ label, detail = null, description = null }) => {
                    return new vscode.CompletionItem({ label, detail, description }, detail ? vscode.CompletionItemKind.Field : vscode.CompletionItemKind.Module)
                })
            },
        })

        context.subscriptions.push(provider)
    },
    deactivate() {},
}
