<script>
const CHANNEL_OPTIONS = {
    negotiated: true,
    id: 123
}
export default {
    data() {
        return {
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
        }
    },
    methods: {
        getConfig() {
            return {
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                iceTransportPolicy: 'all'
            }
            //return {}
        },
        test: async function () {
            const local = new RTCPeerConnection(this.getConfig())
            local.addEventListener('icecandidate', function (event) {
                console.log('sender ICE candidate: ', event.candidate)
                if (event.candidate != null) {
                    this.senderCandidates.push(event.candidate.toJSON())
                } else {
                    this.senderFinishedCandidates = true
                }
                //await remoteConnection.addIceCandidate(event.candidate)
            })
            const channel = local.createDataChannel('sendDataChannel', CHANNEL_OPTIONS)
            const offer = await local.createOffer()
            await local.setLocalDescription(offer)
            /*
            const remote = new RTCPeerConnection(this.getConfig())
            await remote.setRemoteDescription(offer)
            const answer = await remote.createAnswer()
            await remote.setLocalDescription(answer)
            remote.addEventListener('icecandidate', function (event) {
                console.log('receiver ICE candidate: ', event.candidate)
                //await remoteConnection.addIceCandidate(event.candidate)
            })
            await local.setRemoteDescription(answer)
            */
            console.log('sender', local)
            console.log('receiver', remote)
        },
        sendFile: async function () {
            // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
            const pc = new RTCPeerConnection(this.getConfig())
            pc.addEventListener('icecandidate', (event) => {
                console.log('sender ICE candidate: ', event.candidate)
                if (event.candidate != null) {
                    this.senderCandidates.push(event.candidate.toJSON())
                } else {
                    this.senderPayload = JSON.stringify({offer: offer, candidates: this.senderCandidates})
                }
            })
            pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'failed') {
                    pc.restartIce()
                }
            }
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
            const pc = new RTCPeerConnection(this.getConfig())
            pc.addEventListener('icecandidate', (event) => {
                console.log('receiver ICE candidate: ', event.candidate)
                if (event.candidate != null) {
                    this.receiverCandidates.push(event.candidate.toJSON())
                } else {
                    this.receiverPayload = JSON.stringify({answer: answer, candidates: this.receiverCandidates})
                }
            })
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
            const receiverPayload = JSON.parse(this.receiverPayload)
            this.sender.setRemoteDescription(receiverPayload.answer)
            for (const candidate of receiverPayload.candidates) {
                await this.sender.addIceCandidate(candidate)
            }
            console.log('sender', this.sender)
            console.log(this.sendChannel)
        }
    }
}
</script>

<template>
    <main>
        <button @click="test">Test</button>
        <button @click="sendFile">Send</button>
        <button @click="receiveFile">Receive</button>
        <button @click="continueSend">Continue send</button>
        <label>Sender payload</label>
        <textarea rows="8" cols="40" v-model="senderPayload"></textarea>
        <label>Receiver payload</label>
        <textarea rows="8" cols="40" v-model="receiverPayload"></textarea>
    </main>
</template>
