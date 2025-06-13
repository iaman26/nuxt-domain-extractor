<template>
  <div class="container">
    <div class="bg-illustration"></div>
    <div class="main-content">
      <img
        class="logo-img"
        src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=200&q=80"
        alt="Domain Illustration"
      />
      <h1 class="title">Domain Extractor</h1>
      <form class="url-form animated" @submit.prevent="handleSubmit">
        <input
          v-model="url"
          type="url"
          class="url-input"
          placeholder="Nhập URL..."
          required
        />
        <button type="submit" class="submit-btn">Gửi</button>
      </form>
      <button
        v-if="store.data && !store.loading && !store.error"
        @click="downloadCSV"
        class="submit-btn fadein"
        style="margin-top: 12px; width: 120px"
      >
        Tải CSV
      </button>
      <button
        v-if="nextPageUrl"
        @click="downloadNextPage"
        class="submit-btn fadein"
        style="margin-top: 12px; width: 180px"
      >
        Tải CSV trang tiếp
      </button>
      <label
        v-if="nextPageUrl"
        style="margin-top: 8px; display: block"
        class="fadein"
        ><input type="checkbox" v-model="autoDownload" /> Tự động tải liên
        tục</label
      >
      <button
        v-if="autoDownload"
        @click="stopAutoDownload"
        class="submit-btn stop-btn fadein"
        style="margin-top: 8px; width: 120px"
      >
        Dừng tải
      </button>
      <transition name="fade">
        <div v-if="store.loading" class="result loading">Đang tải...</div>
      </transition>
      <transition name="fade">
        <div v-if="store.error" class="result error">
          Lỗi: {{ store.error }}
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useUrlStore } from "./stores/useUrlStore";
const url = ref("");
const store = useUrlStore();
const nextPageUrl = ref(null);
const autoDownload = ref(false);
let autoDownloadTimer = null;

async function handleSubmit() {
  await fetchNextPage(url.value);
}

async function fetchNextPage(inputUrl) {
  const cleanUrl = inputUrl.startsWith("@") ? inputUrl.slice(1) : inputUrl;
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(cleanUrl)}`);
  const data = await res.json();
  store.data = data.html;
  nextPageUrl.value = data.nextPageUrl ? "@" + data.nextPageUrl : null;
}

async function downloadCSV(targetUrl) {
  let urlToUse = typeof targetUrl === "string" ? targetUrl : url.value;
  if (!urlToUse) return;
  const cleanUrl = urlToUse.startsWith("@") ? urlToUse.slice(1) : urlToUse;
  const res = await fetch(
    `/api/proxy?url=${encodeURIComponent(cleanUrl)}&csv=1`
  );
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "domains.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function stopAutoDownload() {
  autoDownload.value = false;
  if (autoDownloadTimer) {
    clearTimeout(autoDownloadTimer);
    autoDownloadTimer = null;
  }
}

async function downloadNextPage() {
  if (!nextPageUrl.value) return;
  await downloadCSV(nextPageUrl.value);
  if (autoDownload.value) {
    await fetchNextPage(nextPageUrl.value);
    if (nextPageUrl.value) {
      autoDownloadTimer = setTimeout(downloadNextPage, 1000);
    }
  }
}
</script>

<style>
body {
  margin: 0;
  font-family: "Segoe UI", "Roboto", Arial, sans-serif;
  background: #f8fafc;
}
.container {
  min-height: 100vh;
  min-width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(120deg, #e0e7ff 0%, #f0fdfa 100%);
}
.bg-illustration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  background: url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80")
    center/cover no-repeat;
  opacity: 0.18;
  filter: blur(2px);
}
.main-content {
  z-index: 2;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(80, 80, 160, 0.13);
  padding: 40px 32px 32px 32px;
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: fadeInUp 0.8s cubic-bezier(0.39, 0.575, 0.56, 1);
}
.logo-img {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  animation: fadeIn 1.2s;
}
.title {
  font-size: 2.1rem;
  font-weight: 700;
  color: #2d3a4a;
  margin-bottom: 18px;
  letter-spacing: 1px;
  text-shadow: 0 2px 8px #e0e7ff;
  animation: fadeIn 1.2s;
}
.url-form {
  display: flex;
  flex-direction: row;
  gap: 10px;
  background: #f4f7ff;
  padding: 18px 12px;
  border-radius: 14px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.07);
  width: 100%;
  max-width: 420px;
  margin-bottom: 10px;
  animation: fadeInUp 1s;
}
.url-input {
  flex: 1;
  padding: 12px 14px;
  border: 1.5px solid #b6c6e3;
  border-radius: 8px;
  font-size: 1.08rem;
  outline: none;
  transition: border 0.2s, box-shadow 0.2s;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}
.url-input:focus {
  border: 1.5px solid #6366f1;
  box-shadow: 0 2px 8px #e0e7ff;
}
.submit-btn {
  padding: 12px 18px;
  background: linear-gradient(90deg, #6366f1 0%, #38bdf8 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.08rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  outline: none;
  margin-left: 2px;
  margin-right: 2px;
  animation: fadeIn 1.2s;
}
.submit-btn:hover {
  background: linear-gradient(90deg, #38bdf8 0%, #6366f1 100%);
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 4px 16px #6366f1aa;
}
.stop-btn {
  background: linear-gradient(90deg, #d32f2f 0%, #f87171 100%);
}
.stop-btn:hover {
  background: linear-gradient(90deg, #f87171 0%, #d32f2f 100%);
}
.result {
  margin-top: 18px;
  padding: 12px;
  border-radius: 10px;
  background: #f4f4f4;
  font-size: 1rem;
  word-break: break-all;
  max-width: 420px;
  overflow-x: auto;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  animation: fadeIn 1.2s;
}
.result.loading {
  color: #6366f1;
}
.result.error {
  color: #d32f2f;
  background: #fff0f0;
}
.fadein {
  animation: fadeIn 1.2s;
}
.animated {
  animation: fadeInUp 1s;
}
@media (max-width: 600px) {
  .main-content {
    padding: 18px 4px 16px 4px;
    max-width: 98vw;
  }
  .url-form {
    flex-direction: column;
    gap: 12px;
    padding: 12px 4px;
  }
  .submit-btn {
    width: 100%;
    margin: 0;
  }
  .result {
    max-width: 98vw;
  }
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(32px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
