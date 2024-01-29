<script>
import { ContractPromise } from '@polkadot/api-contract'
// In case you need signer from mnemonic.
// import { Keyring } from '@polkadot/api'
import { ApiPromise, WsProvider } from '@polkadot/api'
import metadata from '@/assets/metadata.json'
import { contractQuery, contractTx } from '@scio-labs/use-inkathon'
import { web3Enable, web3Accounts, web3FromAddress } from '@polkadot/extension-dapp'

export default {
    data() {
        return {
            azeroIdAPI: null,
            azeroIdContract: null,
            // Fetch.
            azeroIdName: '',
            azeroIdPublicKey: '',
            azeroIdRecords: [],
            azeroIdFetchError: '',
            // Signer extension.
            azeroIdAccounts: [],
            // Update records.
            azeroIdSelectedAccount: null,
            azeroIdNamesToUpdate: [],
            azeroIdSelectedName: '',
            azeroIdRecordKey: '',
            azeroIdRecordValue: '',
        }
    },
    watch: {
        azeroIdName() {
            this.clearAzeroIdFetchFields()
        },
        azeroIdSelectedAccount(val) {
            ;(async () => {
                const { result, output } = await contractQuery(
                    this.azeroIdAPI,
                    '',
                    this.azeroIdContract,
                    'getNamesOfAddress',
                    {},
                    [val],
                )
                if (result.isErr) {
                    console.error(output.toHuman())
                    return
                }
                const data = output.toJSON().ok
                this.azeroIdNamesToUpdate = data
            })()
        },
        azeroIdSelectedName(val) {
            ;(async () => {
                this.azeroIdName = val
                await this.fetchAzeroIdInfo()
            })()
        },
    },
    methods: {
        clearAzeroIdFetchFields: function () {
            this.azeroIdPublicKey = ''
            this.azeroIdRecords = []
            this.azeroIdFetchError = ''
        },
        fetchAzeroIdInfo: async function () {
            this.clearAzeroIdFetchFields()
            const name = this.azeroIdName.replace(/\.azero$/i, '')
            // Check address.
            {
                const { result, output } = await contractQuery(
                    this.azeroIdAPI,
                    '',
                    this.azeroIdContract,
                    'getAddress',
                    {},
                    [name],
                )
                if (result.isErr) {
                    console.error(output.toHuman())
                    return
                }
                const data = output.toJSON().ok
                if (data.err) {
                    console.error(data.err)
                    if (Object.keys(output.toJSON().ok.err)[0] == 'nameDoesntExist')
                        this.azeroIdFetchError = 'This name is not found.'
                    return
                }
                this.azeroIdPublicKey = data.ok
            }
            // Fetch records.
            {
                const { result, output } = await contractQuery(
                    this.azeroIdAPI,
                    '',
                    this.azeroIdContract,
                    'getAllRecords',
                    {},
                    [name],
                )
                if (result.isErr) {
                    console.error(output.toHuman())
                    return
                }
                const records = output.toJSON()
                if (records.ok.length === 0) return
                this.azeroIdRecords = records.ok
            }
        },
        updateAzeroIdRecord: async function () {
            /* 
                It is possible to do the same through keypair.
                const keyring = new Keyring({ type: 'sr25519' })
                const account = keyring.addFromMnemonic('')
            */
            if (!this.azeroIdSelectedAccount) {
                alert('Please, choose an account first!')
                return
            }
            if (this.azeroIdSelectedName === '') {
                alert('Please, choose a name to update!')
                return
            }
            if (!this.azeroIdRecordKey === '') {
                alert('AZERO.ID Record Key is empty.')
                return
            }
            if (!this.azeroIdRecordValue === '') {
                alert('AZERO.ID Record Value is empty.')
                return
            }
            const injector = await web3FromAddress(this.azeroIdSelectedAccount)
            this.azeroIdAPI.setSigner(injector.signer)
            try {
                // This method can also override current value for provided key.
                // If you try to update key with the same value as record already has,
                // there is no fee for such transaction.
                await contractTx(
                    this.azeroIdAPI,
                    this.azeroIdSelectedAccount,
                    this.azeroIdContract,
                    'update_records',
                    {},
                    [
                        this.azeroIdSelectedName,
                        [[this.azeroIdRecordKey, this.azeroIdRecordValue]],
                        false,
                    ],
                    null,
                )
            } catch (e) {
                console.error(e)
                if (e.errorMessage == 'TokenBelowMinimum') alert('Not enough tokens to proceed.')
                return
            }
            this.azeroIdRecordKey = ''
            this.azeroIdRecordValue = ''
        },
    },
    mounted() {
        ;(async () => {
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
            this.azeroIdAPI = api
            this.azeroIdContract = contract

            // Init AlephZero signer extension.
            const extensions = await new web3Enable('Copybara')
            if (extensions.length === 0) {
                alert('Please, connect AlephZero signer extension to use Copybara!')
                return
            }
            const accounts = await web3Accounts({ extensions: ['aleph-zero-signer'] })
            this.azeroIdAccounts = accounts
        })()
    },
}
</script>

<template>
    <label>
        AZERO.ID Name (without ".azero"; use following format: "staex" or "copybara", not
        "staex.azero")
    </label>
    <input type="text" placeholder="AZERO.ID Name" v-model="azeroIdName" />
    <button @click="fetchAzeroIdInfo">Fetch</button>
    <p v-if="azeroIdFetchError" style="color: red">{{ azeroIdFetchError }}</p>
    <p v-if="azeroIdPublicKey">AZERO.ID Public Key: {{ azeroIdPublicKey }}</p>
    <ul>
        <li v-for="record in azeroIdRecords" :key="record[0]">{{ record[0] }} = {{ record[1] }}</li>
    </ul>
    <hr />
    <label>AlephZero signer accounts</label>
    <select v-model="azeroIdSelectedAccount">
        <option disabled value="">Please, select an account to update records.</option>
        <option v-for="account in azeroIdAccounts" :value="account.address" :key="account.address">
            {{ account.meta.name }} ({{ account.address }})
        </option>
    </select>
    <br />
    <label>Update AZERO.ID Metadata Records</label>
    <select v-model="azeroIdSelectedName">
        <option disabled value="">Please, select a name to update records.</option>
        <option v-for="name in azeroIdNamesToUpdate" :value="name" :key="name">
            {{ name }}
        </option>
    </select>
    <br />
    <label>Write new key and value.</label>
    <input type="text" placeholder="StaexMCC-NodeId" v-model="azeroIdRecordKey" />
    <input type="text" placeholder="I like watermelon so much!" v-model="azeroIdRecordValue" />
    <button @click="updateAzeroIdRecord">Update</button>
</template>
