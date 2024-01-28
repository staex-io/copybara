<script setup>
import CopyToClipboardButton from '@/components/CopyToClipboardButton.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'
</script>
<script>
import { AzeroId } from '@/azero-id.js'

const NODE_ID_RECORD = 'StaexMCC_NodeId'
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
        }
    },
    methods: {
        async dial() {
            const azeroId = await AzeroId.connect()
            const src = normalizeName(this.sourceAzeroId)
            const dst = normalizeName(this.destinationAzeroId)
            let srcNodeId = await azeroId.getRecord(src, NODE_ID_RECORD)
            let dstNodeId = await azeroId.getRecord(dst, NODE_ID_RECORD)
            // TODO
            srcNodeId = 'h8syf1xcv3rveegh00p89ew8sqbzkr4ckpjz3zs4xxr5tvf4hs4g'
            dstNodeId = 'h8syf1xcv3rveegh00p89ew8sqbzkr4ckpjz3zs4xxr5tvf4hs4g'
            console.log(src, srcNodeId)
            console.log(dst, dstNodeId)
            this.state = 'calling'
            await this.sendFile()
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
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            }
        },
        sendFile: async function () {
            const localStream = await this.createLocalStream()
            // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
            const pc = new RTCPeerConnection(this.getConfig())
            pc.addEventListener('icecandidate', async (event) => {
                console.log('sender ICE candidate: ', event.candidate)
                if (event.candidate != null) {
                    if (event.candidate.candidate.match(/.*10\.115\..*/)) {
                        console.log('sender add ', event.candidate)
                        this.senderCandidates.push(event.candidate.toJSON())
                    }
                } else {
                    const payload = { offer: offer, candidates: this.senderCandidates }
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
                console.log('ontrack', event.streams)
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
            const localStream = await this.createLocalStream()
            const pc = new RTCPeerConnection(this.getConfig())
            pc.addEventListener('icecandidate', async (event) => {
                console.log('receiver ICE candidate: ', event.candidate)
                if (event.candidate != null) {
                    this.receiverCandidates.push(event.candidate.toJSON())
                } else {
                    this.receiverPayload = JSON.stringify({
                        answer: answer,
                        candidates: this.receiverCandidates,
                    })
                    this.callResponseLink = await encodeLinkPayload(this.receiverPayload)
                    this.state = 'call'
                }
            })
            pc.ontrack = (event) => {
                console.log('ontrack', event.streams)
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
            const senderPayload = JSON.parse(this.senderPayload)
            pc.setRemoteDescription(senderPayload.offer)
            for (const candidate of senderPayload.candidates) {
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
    <ul class="videos">
        <li><video id="video-local" autoplay></video></li>
        <li><video id="video-remote" autoplay></video></li>
    </ul>
</template>
