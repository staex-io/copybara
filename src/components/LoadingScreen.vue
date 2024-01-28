<script></script>
<!-- https://loading.io/css/ -->
<template>
    <div><small>Loading... Please wait.</small></div>
    <div class="lds-grid">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
    </div>
</template>

<style scoped>
.lds-grid {
    display: inline-block;
    position: relative;
    width: 80px;
    height: 80px;
}
.lds-grid div {
    position: absolute;
    width: 16px;
    height: 16px;
    animation: lds-grid 2.4s linear infinite;
    background-color: var(--staex-white);
}
.lds-grid div:nth-child(1) {
    top: 8px;
    left: 8px;
    animation-delay: 0s;
}
.lds-grid div:nth-child(2) {
    top: 8px;
    left: 32px;
    animation-delay: -1.8s;
}
.lds-grid div:nth-child(3) {
    top: 8px;
    left: 56px;
    animation-delay: -0.6s;
}
.lds-grid div:nth-child(4) {
    top: 32px;
    left: 8px;
    animation-delay: -1.2s;
}
.lds-grid div:nth-child(5) {
    top: 32px;
    left: 32px;
    animation-delay: 0s;
}
.lds-grid div:nth-child(6) {
    top: 32px;
    left: 56px;
    animation-delay: -1.2s;
}
.lds-grid div:nth-child(7) {
    top: 56px;
    left: 8px;
    animation-delay: -0.6s;
}
.lds-grid div:nth-child(8) {
    top: 56px;
    left: 32px;
    animation-delay: -1.8s;
}
.lds-grid div:nth-child(9) {
    top: 56px;
    left: 56px;
    animation-delay: 0s;
    background-color: var(--staex-metallic-gold);
}
@keyframes lds-grid {
    0%,
    100% {
        /* triangles */
        clip-path: path(
            'm 4.2310613,0.45448026 c -1.721107,-1.032665 -3.080783,-0.240955 -3.080783,1.72110804 V 13.810279 c 0,1.996485 1.376887,2.770984 3.080783,1.721108 L 13.559468,9.8517303 a 1.9964854,1.9964854 0 0 0 0,-3.734804 z'
        );
    }
    25% {
        /* rombs */
        clip-path: path(
            'm 15.147772,10.06039 -5.087382,5.087382 c -1.138592,1.136304 -2.982188,1.136304 -4.12078,0 L 0.852228,10.06039 c -1.136304,-1.138592 -1.136304,-2.982188 0,-4.12078 L 5.93961,0.852228 c 1.138592,-1.136304 2.982188,-1.136304 4.12078,0 l 5.087382,5.087382 c 1.136304,1.138592 1.136304,2.982188 0,4.12078'
        );
    }
    50% {
        /* squares */
        clip-path: path(
            'M 16.113475,12.444444 A 3.5555556,3.5555556 0 0 1 12.55792,16 H 3.555556 A 3.5555556,3.5555556 0 0 1 0,12.444444 V 3.555556 A 3.5555556,3.5555556 0 0 1 3.555556,0 h 8.907801 a 3.5555556,3.5555556 0 0 1 3.555556,3.555556 z'
        );
    }
    75% {
        /* circles */
        clip-path: path('M 15.99998,7.9821831 A 8,8 0 1 1 7.999981,0 8,8 0 0 1 15.99998,7.9821831');
    }
}
</style>
