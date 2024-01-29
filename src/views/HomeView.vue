<script setup>
import CopyToClipboardButton from '@/components/CopyToClipboardButton.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'
</script>
<script>
import { AzeroId } from '@/azero-id.js'

const NODE_ID_RECORD = 'staex-id'
const MCC_HTTP_URL = 'http://127.0.0.1:9377'
const CHANNEL_OPTIONS = {
    negotiated: true,
    id: 123,
}
export default {
    data() {
        return {
            state: 'dialing',
            sourceAzeroId: 'staex.azero',
            destinationAzeroId: 'copybara.azero',
            sourceIp: '',
            destinationIp: '',
            sourceNodeId: '',
            destinationNodeId: '',
            offer: '',
            answer: '',
            sender: null,
            receiver: null,
            sendChannel: null,
            receiveChannel: null,
            senderCandidates: [],
            receiverCandidates: [],
            senderPayload: '',
            receiverPayload: '',
            callRequestLink: '',
            callResponseLink: '',
            error: '',
        }
    },
    methods: {
        async senderInit() {
            const azeroId = await AzeroId.connect()
            const src = normalizeName(this.sourceAzeroId)
            const dst = normalizeName(this.destinationAzeroId)
            let srcNodeId = await azeroId.getRecord(src, NODE_ID_RECORD)
            let dstNodeId = await azeroId.getRecord(dst, NODE_ID_RECORD)
            const srcNodeId2 = await (await fetch(`${MCC_HTTP_URL}/id`)).json()
            if (srcNodeId !== srcNodeId2) {
                throw `Staex node id and your Azero Id do not match: ${srcNodeId2} vs. ${srcNodeId}.`
            }
            const srcIp = await resolveNodeId(srcNodeId)
            const dstIp = await resolveNodeId(dstNodeId)
            console.log(src, srcNodeId, srcIp)
            console.log(dst, dstNodeId, dstIp)
            this.sourceIp = srcIp
            this.destinationIp = dstIp
            this.sourceNodeId = srcNodeId
            this.destinationNodeId = dstNodeId
        },
        async receiverInit(sourceNodeId, destinationNodeId) {
            const localNodeId = await (await fetch(`${MCC_HTTP_URL}/id`)).json()
            if (destinationNodeId !== localNodeId) {
                throw `Destination node id does not match your local node id: ${destinationNodeId} vs. ${localNodeId}.`
            }
            const srcIp = await resolveNodeId(sourceNodeId)
            const dstIp = await resolveNodeId(destinationNodeId)
            console.log(sourceNodeId, srcIp)
            console.log(destinationNodeId, dstIp)
            this.sourceIp = srcIp
            this.destinationIp = dstIp
            this.sourceNodeId = sourceNodeId
            this.destinationNodeId = destinationNodeId
        },
        async dial() {
            this.error = ''
            try {
                await this.senderInit()
                this.state = 'calling'
                await this.sendFile()
            } catch (error) {
                this.error = error
            }
        },
        createLocalStream: async function () {
            const constraints = {
                audio: true,
                video: true,
            }
            const localStream = await navigator.mediaDevices.getUserMedia(constraints)
            const videoLocal = document.getElementById('video-local')
            videoLocal.srcObject = localStream
            videoLocal.muted = 'muted'
            return localStream
        },
        getConfig() {
            return {
                //iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            }
        },
        sendFile: async function () {
            const localStream = await this.createLocalStream()
            // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
            const pc = new RTCPeerConnection(this.getConfig())
            pc.addEventListener('icecandidate', async (event) => {
                if (event.candidate != null) {
                    if (event.candidate.candidate.includes(this.sourceIp)) {
                        console.log('sender add ', event.candidate)
                        this.senderCandidates.push(event.candidate.toJSON())
                    }
                } else {
                    const payload = {
                        offer: offer,
                        candidates: this.senderCandidates,
                        sourceNodeId: this.sourceNodeId,
                        destinationNodeId: this.destinationNodeId,
                        sourceIp: this.sourceIp,
                    }
                    console.log('sender payload', payload)
                    this.senderPayload = JSON.stringify(payload)
                    this.callRequestLink = await encodeLinkPayload(this.senderPayload)
                    this.state = 'call'
                }
            })
            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'failed') {
                    pc.restartIce()
                }
            }
            pc.ontrack = (event) => {
                const videoRemote = document.getElementById('video-remote')
                if (videoRemote.srcObject !== event.streams[0]) {
                    videoRemote.srcObject = event.streams[0]
                }
            }
            localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
            this.sendChannel = pc.createDataChannel('channel', CHANNEL_OPTIONS)
            this.sendChannel.onmessage = function (event) {
                console.log('send', event)
            }
            this.sendChannel.onopen = () => {
                console.log('send open')
                this.sendChannel.send('hello world')
            }
            this.sendChannel.onclose = function () {
                console.log('send close')
            }
            this.sendChannel.onerror = function (e) {
                console.log('send error', e)
            }
            const offer = await pc.createOffer()
            pc.setLocalDescription(offer)
            this.offer = offer
            this.sender = pc
        },
        receiveFile: async function () {
            this.error = ''
            const senderPayload = JSON.parse(this.senderPayload)
            await this.receiverInit(senderPayload.sourceNodeId, senderPayload.destinationNodeId)
            const localStream = await this.createLocalStream()
            const pc = new RTCPeerConnection(this.getConfig())
            pc.addEventListener('icecandidate', async (event) => {
                if (event.candidate != null) {
                    if (event.candidate.candidate.includes(this.destinationIp)) {
                        console.log('receiver add ', event.candidate)
                        this.receiverCandidates.push(event.candidate.toJSON())
                    }
                } else {
                    this.receiverPayload = JSON.stringify({
                        answer: answer,
                        candidates: this.receiverCandidates,
                        destinationIp: this.destinationIp,
                    })
                    this.callResponseLink = await encodeLinkPayload(this.receiverPayload)
                    this.state = 'call'
                }
            })
            pc.ontrack = (event) => {
                const videoRemote = document.getElementById('video-remote')
                if (videoRemote.srcObject !== event.streams[0]) {
                    videoRemote.srcObject = event.streams[0]
                }
            }
            localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
            this.receiveChannel = pc.createDataChannel('channel', CHANNEL_OPTIONS)
            this.receiveChannel.onmessage = function (event) {
                console.log('recv', event)
            }
            this.receiveChannel.onopen = function () {
                console.log('recv open')
            }
            this.receiveChannel.onclose = function () {
                console.log('recv close')
            }
            this.receiveChannel.onerror = function (e) {
                console.log('recv error', e)
            }
            pc.setRemoteDescription(senderPayload.offer)
            for (const candidate of senderPayload.candidates) {
                replaceIps(candidate, senderPayload.sourceIp, this.sourceIp)
                console.log('add ice candidate', candidate)
                await pc.addIceCandidate(candidate)
            }
            const answer = await pc.createAnswer()
            this.answer = answer
            pc.setLocalDescription(answer)
            /*
            pc.addEventListener('datachannel', async (event) => {
                this.receiveChannel = event.channel
                this.receiveChannel.onmessage = function (event) {
                    console.log('recv', event)
                }
                this.receiveChannel.onopen = function () {
                    console.log('recv open')
                }
                this.receiveChannel.onclose = function () {
                    console.log('recv close')
                }
                this.receiveChannel.onerror = function (e) {
                    console.log('recv error', e)
                }
            })
            */
            this.receiver = pc
            console.log('receiver', this.receiver)
        },
        continueSend: async function () {
            const payload = await decodeLinkPayload(this.receiverPayload)
            const receiverPayload = JSON.parse(payload)
            this.sender.setRemoteDescription(receiverPayload.answer)
            for (const candidate of receiverPayload.candidates) {
                replaceIps(candidate, receiverPayload.destinationIp, this.destinationIp)
                console.log('add ice candidate', candidate)
                await this.sender.addIceCandidate(candidate)
            }
            this.state = 'call-in-progress'
            console.log('sender', this.sender)
            console.log('sendChannel', this.sendChannel)
        },
        hide() {
            this.state = 'call-in-progress'
        },
    },
    mounted: async function () {
        const payloadString = await decodeLinkPayload(window.location.href)
        const payload = JSON.parse(payloadString)
        console.log('payload', payload)
        if ('offer' in payload) {
            this.state = 'receiving-call'
            this.senderPayload = payloadString
            await this.receiveFile()
        } else {
            this.state = 'dialing'
        }
    },
}

async function encodeLinkPayload(payload) {
    const path = window.location.href.split('?')[0]
    const stream = new Blob([payload]).stream()
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
    const chunks = []
    for await (const chunk of compressedStream) {
        chunks.push(chunk)
    }
    const bytes = await concatUint8Arrays(chunks)
    const query = uint8arrayToBase64(bytes)
    return path + '?' + encodeURIComponent(query)
}

async function decodeLinkPayload(href) {
    const pathAndQuery = href.split('?')
    if (pathAndQuery.length === 1) {
        return '{}'
    }
    const query = decodeURIComponent(pathAndQuery[1])
    const bytes = base64ToUint8Array(query)
    const stream = new Blob([bytes]).stream()
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'))
    const chunks = []
    for await (const chunk of decompressedStream) {
        chunks.push(chunk)
    }
    const stringBytes = await concatUint8Arrays(chunks)
    return new TextDecoder().decode(stringBytes)
}

async function concatUint8Arrays(uint8arrays) {
    const blob = new Blob(uint8arrays)
    const buffer = await blob.arrayBuffer()
    return new Uint8Array(buffer)
}

function uint8arrayToBase64(value) {
    return btoa(String.fromCharCode.apply(null, value))
}

function base64ToUint8Array(base64) {
    const bytes = atob(base64)
    const array = new Uint8Array(bytes.length)
    for (var i = 0; i < bytes.length; ++i) {
        array[i] = bytes.charCodeAt(i)
    }
    return array
}

function normalizeName(name) {
    return name.trim().replace(/\.azero$/i, '')
}

// MCC dynamic ips
function replaceIps(candidate, sourceIp, destinationIp) {
    candidate.candidate = candidate.candidate.replace(sourceIp, destinationIp)
}

async function resolveNodeId(nodeId) {
    return await (await fetch(`${MCC_HTTP_URL}/resolve?node-id=${nodeId}`)).json()
}

//async function resolveNodeIdStatic(nodeId) {
//    return await (await fetch(`${MCC_HTTP_URL}/property?node-id=${nodeId}&name=static-addr`)).json()
//}
</script>

<template>
    <div v-if="state === 'dialing'">
        <p>
            <label>Your Azero id</label>
            <input type="text" id="sourceAzeroId" v-model="sourceAzeroId" />
        </p>
        <p>
            <label>Recipient's Azero id</label>
            <input type="text" id="destinationAzeroId" v-model="destinationAzeroId" />
        </p>
        <p>
            <button @click="dial">Dial</button>
        </p>
    </div>
    <div v-if="state === 'calling'">
        <LoadingScreen v-if="callRequestLink === ''" />
    </div>
    <div v-if="state === 'receiving-call'">
        <LoadingScreen v-if="callResponseLink === ''" />
    </div>
    <div v-if="state === 'call'">
        <div v-if="callRequestLink !== ''">
            <p>
                <a id="call-request-link" :href="callRequestLink">Call request link</a>
                <input type="hidden" :value="callRequestLink" id="callRequestLink" />
            </p>
            <p><CopyToClipboardButton id="callRequestLink" class="" /></p>
            <p>
                <label>Confirmation link</label>
                <textarea rows="8" cols="40" v-model="receiverPayload"></textarea>
            </p>
            <p><button @click="continueSend">Accept</button></p>
        </div>
        <div v-if="callResponseLink !== ''">
            <p>
                <a id="call-response-link" :href="callResponseLink">Confirmation link</a>
                <input type="hidden" :value="callResponseLink" id="callResponseLink" />
            </p>
            <p><CopyToClipboardButton id="callResponseLink" class="" /></p>
            <p><button @click="hide">Hide</button></p>
        </div>
    </div>
    <div v-if="error !== ''" class="error">{{ error }}</div>
    <ul class="videos">
        <li><video id="video-local" autoplay></video></li>
        <li><video id="video-remote" autoplay></video></li>
    </ul>
</template>
