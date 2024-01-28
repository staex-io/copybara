<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
    <header>
        <nav>
            <img class="logo" alt="Staex logo" src="@/assets/logo-light.svg" />
            <ul>
                <li><RouterLink to="/">Call</RouterLink></li>
                <li><RouterLink to="/azero-id">Azero id</RouterLink></li>
            </ul>
        </nav>
    </header>
    <main>
        <RouterView />
    </main>
    <footer>
        <ul>
            <li><a href="https://staex.io/legal-notice">Legal notice</a></li>
            <li><a href="https://staex.io/privacy">Privacy policy</a></li>
            <li>2023–2024 &copy; Staex GmbH</li>
        </ul>
    </footer>
</template>
