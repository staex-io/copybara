const http = require('http')
const child_process = require('child_process')

const MCC_COMMAND = ['docker', 'exec', 'mcc', 'mcc']

const host = '127.0.0.1'
const port = 9377

const STATIC_IPS = {
    h8syf1xcv3rveegh00p89ew8sqbzkr4ckpjz3zs4xxr5tvf4hs4g: '10.115.0.1',
    ctnsaj8135fsnm5t1fqda6093g95pjzfdhms77trjk6fy1ks6a80: '10.115.0.2',
}

function setMandatoryHeaders(response) {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Content-Type', 'application/json')
}

const requestListener = function (request, response) {
    const url = new URL(request.protocol + '://' + request.url)
    switch (url.pathname) {
        case '/id': {
            const child = child_process.spawnSync(
                MCC_COMMAND[0],
                MCC_COMMAND.slice(1).concat(['id']),
                {
                    encoding: 'utf8',
                },
            )
            const body = Buffer.from(JSON.stringify(child.stdout.trim()))
            setMandatoryHeaders(response)
            response.setHeader('Content-Length', body.length)
            response.writeHead(200)
            response.end(body)
            break
        }
        /*
        case '/property': {
            const name = url.searchParams.get('name')
            const nodeId = url.searchParams.get('node-id')
            if (
                name == null ||
                nodeId == null ||
                name !== 'static-addr' ||
                !(nodeId in STATIC_IPS)
            ) {
                setMandatoryHeaders(response)
                response.setHeader('Content-Length', 0)
                response.writeHead(400)
                response.end()
                break
            }
            const body = Buffer.from(JSON.stringify(STATIC_IPS[nodeId]))
            setMandatoryHeaders(response)
            response.setHeader('Content-Length', body.length)
            response.writeHead(200)
            response.end(body)
            break
        }
        */
        case '/resolve': {
            const nodeId = url.searchParams.get('node-id')
            if (nodeId == null) {
                setMandatoryHeaders(response)
                response.setHeader('Content-Length', 0)
                response.writeHead(400)
                response.end()
                break
            }
            const child = child_process.spawnSync(
                MCC_COMMAND[0],
                MCC_COMMAND.slice(1).concat(['resolve', nodeId]),
                {
                    encoding: 'utf8',
                },
            )
            const body = Buffer.from(JSON.stringify(child.stdout.trim()))
            setMandatoryHeaders(response)
            response.setHeader('Content-Length', body.length)
            response.writeHead(200)
            response.end(body)
            break
        }
        default:
            response.writeHead(404)
            response.end('')
            break
    }
    console.log(response.statusCode, request.url)
}
const server = http.createServer(requestListener)
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`)
})
