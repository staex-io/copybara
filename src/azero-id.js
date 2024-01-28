import metadata from '@/assets/metadata.json'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { ContractPromise } from '@polkadot/api-contract'
import { contractQuery } from '@scio-labs/use-inkathon'

export class AzeroId {
    constructor(api, contract) {
        this.api = api
        this.contract = contract
    }

    static async connect() {
        // Connect to AlephZero and init API and contract.
        const provider = new WsProvider('wss://ws.azero.dev/')
        const api = await ApiPromise.create({ provider })
        const [chain, nodeName, nodeVersion] = await Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.name(),
            api.rpc.system.version(),
        ])
        console.log(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`)
        const contract = new ContractPromise(
            api,
            metadata,
            '5CTQBfBC9SfdrCDBJdfLiyW2pg9z5W6C6Es8sK313BLnFgDf',
        )
        return new AzeroId(api, contract)
    }

    // Get wallet address by name.
    async getAddress(name) {
        const { result, output } = await contractQuery(
            this.api,
            '',
            this.contract,
            'getAddress',
            {},
            [name],
        )
        if (result.isErr) {
            throw output.toHuman()
        }
        const data = output.toJSON().ok
        if (data.err) {
            throw data.err
        }
        return data.ok
    }

    // Get all records by name.
    async getAllRecords(name) {
        const { result, output } = await contractQuery(
            this.api,
            '',
            this.contract,
            'getAllRecords',
            {},
            [name],
        )
        if (result.isErr) {
            throw output.toHuman()
        }
        return output.toJSON().ok
    }

    // Get specific record by name.
    async getRecord(name, key) {
        const records = await this.getAllRecords(name)
        for (const record of records) {
            if (record[0] === key) {
                return record[1]
            }
        }
        return null
    }
}
