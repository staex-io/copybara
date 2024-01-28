<script setup>
const props = defineProps(['id', 'class'])
</script>

<script>
export default {
    data() {
        return {
            buttonText: '',
            timeoutId: null,
            disabled: false,
        }
    },
    methods: {
        copyToClipboard(event) {
            const id = event.target.dataset['id']
            const elem = document.getElementById(id)
            if (navigator.clipboard) {
                navigator.clipboard.writeText(elem.value).then(
                    () => {
                        this.buttonText = `Copied!`
                        this.disabled = true
                        this.scheduleButtonReset()
                    },
                    (error) => {
                        this.buttonText = 'Text was not copied: ' + error
                    },
                )
            } else {
                this.buttonText = 'Clipboard is unavailable.'
            }
        },
        scheduleButtonReset() {
            if (this.timeoutId) {
                clearInterval(this.timeoutId)
                this.timeoutId = null
            }
            this.timeoutId = setTimeout(() => {
                this.reset()
            }, 3 * 1000)
        },
        reset() {
            this.buttonText = 'Copy'
            this.disabled = false
        },
    },
    beforeMount() {
        this.reset()
    },
}
</script>

<template>
    <button
        type="button"
        @click="copyToClipboard"
        :data-id="props.id"
        :class="props.class"
        :disabled="disabled"
    >
        {{ buttonText }}
    </button>
</template>

<style scoped></style>
