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
      <input
        v-model="url"
        @change="onUrlChange"
        type="url"
        class="url-input"
        placeholder="Nhập URL..."
        required
        style="margin-bottom: 16px"
      />
      <div class="page-input-group">
        <label class="page-label">
          https://www.example3.com/domains?page=
        </label>
        <input
          type="number"
          v-model.number="pageNumber"
          min="1"
          max="5000"
          class="page-input"
          placeholder="1"
          style="margin-bottom: 16px"
        />
      </div>
      <button
        @click="startPageExtraction"
        class="submit-btn fadein"
        style="margin-top: 12px; width: 200px"
        :disabled="isPageExtracting"
      >
        {{ isPageExtracting ? "Đang tải..." : "Bắt đầu tải domain" }}
      </button>
      <label
        v-if="isPageExtracting"
        style="margin-top: 8px; display: block"
        class="fadein"
        ><input
          type="checkbox"
          v-model="autoPageExtract"
          :disabled="!isPageExtracting"
        />
        Tự động tải liên tục</label
      >
      <button
        v-if="isPageExtracting"
        @click="stopPageExtraction"
        class="submit-btn stop-btn fadein"
        style="margin-top: 8px; width: 120px"
      >
        Dừng tải
      </button>
      <div
        v-if="isPageExtracting || pageExtractMessage || currentPageUrl"
        class="status-panel fadein"
      >
        <div v-if="isPageExtracting" class="status-section">
          <div class="status-icon">🔄</div>
          <div class="status-content">
            <div class="status-title">Tiến độ tải trang</div>
            <div class="status-detail">
              Đang tải trang {{ currentPage }}/{{ totalPages }} ({{
                Math.round((currentPage / totalPages) * 100)
              }}%)
            </div>
          </div>
        </div>
        <div v-if="currentPageUrl" class="status-section">
          <div class="status-icon">🔗</div>
          <div class="status-content">
            <div class="status-title">URL đang tải</div>
            <div class="status-detail url-text">{{ currentPageUrl }}</div>
          </div>
        </div>
        <div v-if="pageExtractMessage" class="status-section">
          <div class="status-icon">
            {{ pageExtractMessage.includes("thành công") ? "✅" : "ℹ️" }}
          </div>
          <div class="status-content">
            <div class="status-title">Kết quả</div>
            <div class="status-detail">{{ pageExtractMessage }}</div>
          </div>
        </div>
      </div>
      <transition name="fade">
        <div v-if="lastBatchEndUrl" class="last-url-group">
          <label class="last-url-label">
            <span class="last-url-icon">🔗</span> URL trang cuối cùng đã tải:
          </label>
          <div class="last-url-row">
            <input :value="lastBatchEndUrl" readonly class="last-url-input" />
            <button @click="copyLastUrl" class="last-url-copy">Copy</button>
            <button
              @click="clearLastUrl"
              class="last-url-clear"
              title="Xóa URL"
            >
              🗑️
            </button>
          </div>
        </div>
      </transition>
      <transition name="fade">
        <div v-if="store.loading" class="result loading">Đang tải...</div>
      </transition>
      <transition name="fade">
        <div v-if="store.error" class="result error">
          Lỗi: {{ store.error }}
        </div>
      </transition>
      <div class="extract-link-box" style="margin-top: 24px; width: 100%">
        <label style="font-weight: 600; margin-bottom: 6px; display: block"
          >Nhập HTML chứa các thẻ a để lấy danh sách link:</label
        >
        <textarea
          v-model="htmlInput"
          rows="5"
          class="url-input"
          style="width: 100%; margin-bottom: 8px"
        ></textarea>
        <button
          @click="extractLinksFromHtmlInput"
          class="submit-btn"
          style="width: 180px; margin-bottom: 8px"
        >
          Lấy danh sách link
        </button>
        <button
          v-if="extractedLinks.length"
          @click="fetchAllLinksAndExtractDomainsInBatches"
          class="submit-btn"
          style="
            width: 320px;
            margin-left: 8px;
            margin-bottom: 8px;
            background: linear-gradient(90deg, #059669 0%, #10b981 100%);
          "
        >
          Lấy domain từ từng batch 50 link & Xuất nhiều file CSV
        </button>
        <div v-if="extractedLinks.length" style="margin-top: 10px">
          <label style="font-weight: 600; margin-bottom: 4px; display: block"
            >Danh sách link (có thể copy):</label
          >
          <textarea
            :value="extractedLinks.join('\n')"
            rows="6"
            readonly
            class="url-input"
            style="width: 100%"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useUrlStore } from "./stores/useUrlStore";
const url = ref("");
const store = useUrlStore();
const nextPageUrl = ref(null);
const autoDownload = ref(false);
let autoDownloadTimer = null;
const isBatchLoading = ref(false);
const lastBatchEndUrl = ref("");
if (process.client) {
  lastBatchEndUrl.value = localStorage.getItem("lastBatchEndUrl") || "";
}
const batchSize = ref(5);
const currentBatchNumber = ref(0);
const batchMessage = ref("");
const currentCallingUrl = ref("");
const pageNumber = ref(1);
const autoPageExtract = ref(false);
const isPageExtracting = ref(false);
const currentPage = ref(1);
const totalPages = ref(5000);
const pageExtractMessage = ref("");
const currentPageUrl = ref("");
const htmlInput = ref("");
const extractedLinks = ref([]);
const lockedDomains = ref([]);
const isLocking = ref(false);

const whitelist = [
  ".uk.com",
  ".uk.net",
  ".us.com",
  ".jpn.com",
  ".in.net",
  ".co.com",
  ".eu.com",
  ".de.com",
  ".br.com",
  ".ru.com",
  ".sa.com",
  ".com.co",
  ".cn.com",
  ".ae.org",
  ".co.uk",
  ".org.uk",
  ".co.com",
];

function extractDomainsFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const links = Array.from(doc.querySelectorAll("a"));
  const domains = links
    .map((a) => {
      try {
        const href = a.getAttribute("href");
        if (!href) return null;
        const u = new URL(href);
        return u.hostname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return domains.filter((domain) =>
    whitelist.some((ext) => domain.endsWith(ext))
  );
}

function getNextPageUrlFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const links = Array.from(doc.querySelectorAll("a"));
  for (const a of links) {
    if (a.textContent.trim().toLowerCase().includes("next page")) {
      return a.getAttribute("href");
    }
  }
  return null;
}

async function onUrlChange() {
  if (!url.value) return;
  autoDownload.value = false;
  await fetchNextPage(url.value);
}

async function fetchNextPage(inputUrl) {
  const cleanUrl = inputUrl.startsWith("@") ? inputUrl.slice(1) : inputUrl;
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(cleanUrl)}`);
  const data = await res.json();
  store.data = data.html;
  const next = data.nextPageUrl;
  nextPageUrl.value = next
    ? next.startsWith("http")
      ? next
      : new URL(next, cleanUrl).href
    : null;
}

async function downloadNextBatch() {
  if (isBatchLoading.value || !nextPageUrl.value || autoDownload.value) return;
  isBatchLoading.value = true;
  currentBatchNumber.value = 0;
  batchMessage.value = "";
  currentCallingUrl.value = "";
  let batch = 0;
  let htmls = [store.data];
  let next = nextPageUrl.value;
  let lastUrl = url.value.startsWith("@") ? url.value.slice(1) : url.value;
  let lastFetchedUrl = lastUrl;

  while (next && batch < batchSize.value - 1) {
    currentBatchNumber.value = batch + 1;
    const nextUrl = next.startsWith("http")
      ? next
      : new URL(next, lastUrl).href;
    currentCallingUrl.value = nextUrl;
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(nextUrl)}`);
    const data = await res.json();
    htmls.push(data.html);
    lastFetchedUrl = nextUrl;
    next = data.nextPageUrl;
    lastUrl = nextUrl;
    batch++;
  }
  lastBatchEndUrl.value = lastFetchedUrl;
  if (process.client) {
    localStorage.setItem("lastBatchEndUrl", lastFetchedUrl);
  }

  let allDomains = htmls.flatMap(extractDomainsFromHtml);
  allDomains = Array.from(new Set(allDomains));
  if (allDomains.length) {
    const csvContent = allDomains.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "domains.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    batchMessage.value = `Đã tìm thấy ${allDomains.length} domain và xuất file CSV thành công`;
  } else {
    batchMessage.value = "Không tìm thấy domain nào trong các trang vừa tải";
  }
  nextPageUrl.value = next
    ? next.startsWith("http")
      ? next
      : new URL(next, lastUrl).href
    : null;
  isBatchLoading.value = false;
  currentBatchNumber.value = 0;
  currentCallingUrl.value = "";
}

async function autoDownloadNextPages() {
  if (isBatchLoading.value || !autoDownload.value || !nextPageUrl.value) return;
  isBatchLoading.value = true;
  currentBatchNumber.value = 0;
  batchMessage.value = "";
  currentCallingUrl.value = "";
  let batch = 0;
  let htmls = [store.data];
  let next = nextPageUrl.value;
  let lastUrl = url.value.startsWith("@") ? url.value.slice(1) : url.value;
  let lastFetchedUrl = lastUrl;

  while (next && batch < batchSize.value) {
    if (!autoDownload.value) {
      store.data = null;
      nextPageUrl.value = null;
      url.value = "";
      currentCallingUrl.value = "";
      break;
    }
    currentBatchNumber.value = batch + 1;
    const nextUrl = next.startsWith("http")
      ? next
      : new URL(next, lastUrl).href;
    currentCallingUrl.value = nextUrl;
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(nextUrl)}`);
    const data = await res.json();
    htmls.push(data.html);
    lastFetchedUrl = nextUrl;
    next = data.nextPageUrl;
    lastUrl = nextUrl;
    batch++;
  }
  lastBatchEndUrl.value = lastFetchedUrl;
  if (process.client) {
    localStorage.setItem("lastBatchEndUrl", lastFetchedUrl);
  }

  let allDomains = htmls.flatMap(extractDomainsFromHtml);
  allDomains = Array.from(new Set(allDomains));
  if (allDomains.length && autoDownload.value) {
    const csvContent = allDomains.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "domains.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    batchMessage.value = `Đã tìm thấy ${allDomains.length} domain và xuất file CSV thành công`;
  } else if (!allDomains.length) {
    batchMessage.value = "Không tìm thấy domain nào trong các trang vừa tải";
  }
  nextPageUrl.value = next
    ? next.startsWith("http")
      ? next
      : new URL(next, lastUrl).href
    : null;
  isBatchLoading.value = false;
  currentBatchNumber.value = 0;
  currentCallingUrl.value = "";
  if (autoDownload.value && nextPageUrl.value) {
    autoDownloadTimer = setTimeout(autoDownloadNextPages, 1000);
  }
}

watch(autoDownload, (val) => {
  if (val && nextPageUrl.value) autoDownloadNextPages();
  else stopAutoDownload();
});

function stopAutoDownload() {
  autoDownload.value = false;
  store.data = null;
  nextPageUrl.value = null;
  url.value = "";
}

function clearLastUrl() {
  lastBatchEndUrl.value = "";
  if (process.client) {
    localStorage.removeItem("lastBatchEndUrl");
  }
}

function copyLastUrl() {
  if (!lastBatchEndUrl.value) return;
  navigator.clipboard.writeText(lastBatchEndUrl.value);
}

async function startPageExtraction() {
  if (isPageExtracting.value) return;
  isPageExtracting.value = true;
  currentPage.value = pageNumber.value;
  pageExtractMessage.value = "";
  currentPageUrl.value = "";

  const batchSize = 50; // Gộp 50 trang thành 1 file
  let startPage = pageNumber.value;

  while (startPage <= 5000 && isPageExtracting.value) {
    const endPage = Math.min(startPage + batchSize - 1, 5000);
    pageExtractMessage.value = `Đang tải lần lượt ${batchSize} trang từ ${startPage} đến ${endPage}...`;
    console.log(`Bắt đầu tải batch: ${startPage} - ${endPage}`);

    let allDomains = [];

    // Chạy lần lượt từng trang
    for (let page = startPage; page <= endPage; page++) {
      if (!isPageExtracting.value) break;

      const pageUrl = `https://www.example3.com/domains?page=${page}`;
      currentPageUrl.value = pageUrl;
      currentPage.value = page;

      try {
        console.log(`Đang tải trang ${page}: ${pageUrl}`);

        // Use proxy endpoint instead of direct API call
        const res = await fetch(
          `/api/proxy?url=${encodeURIComponent(pageUrl)}`,
          {
            headers: {
              Accept: "application/json, text/plain, */*",
            },
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        const html = data.html;

        console.log(`Trang ${page} response length:`, html.length);

        if (html) {
          const domains = extractDomainsFromPageHtml(html);
          console.log(
            `Trang ${page} tìm được ${domains.length} domain:`,
            domains
          );
          allDomains = allDomains.concat(domains);
        } else {
          console.log(`Trang ${page} không có HTML data`);
        }
      } catch (error) {
        console.error(`Lỗi khi tải trang ${page}:`, error);
      }

      // Delay nhỏ giữa các trang
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log(`Tổng số domain tìm được trong batch: ${allDomains.length}`);

    // Loại bỏ domain trùng lặp và xuất CSV
    const uniqueDomains = Array.from(new Set(allDomains));
    console.log(`Số domain unique sau khi lọc: ${uniqueDomains.length}`);

    if (uniqueDomains.length > 0) {
      const csvContent = uniqueDomains.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `domains_page_${startPage}_to_${endPage}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      pageExtractMessage.value = `Đã tìm thấy ${uniqueDomains.length} domain và xuất file CSV thành công (trang ${startPage} - ${endPage})`;
      console.log(
        `Đã xuất file CSV: domains_page_${startPage}_to_${endPage}.csv`
      );
    } else {
      pageExtractMessage.value = `Không tìm thấy domain nào trong trang ${startPage} - ${endPage}`;
      console.log(
        `Không có domain nào được tìm thấy trong batch ${startPage} - ${endPage}`
      );
    }

    startPage += batchSize;

    // Delay nhỏ giữa các batch
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  isPageExtracting.value = false;
  currentPageUrl.value = "";
  pageExtractMessage.value = "Hoàn thành tải tất cả trang!";
}

function extractDomainsFromPageHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const links = Array.from(doc.querySelectorAll("a[href^='/domain/']"));
  const domains = links
    .map((a) => {
      try {
        const href = a.getAttribute("href");
        if (!href) return null;
        // Lấy domain từ href="/domain/ytport.com" -> ytport.com
        const domain = href.replace("/domain/", "");
        return domain;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((domain) => whitelist.some((ext) => domain.endsWith(ext))); // Lọc theo whitelist
  return domains;
}

async function stopPageExtraction() {
  autoPageExtract.value = false;
  isPageExtracting.value = false;
  store.data = null;
  nextPageUrl.value = null;
  url.value = "";
}

async function testApiProxy() {
  console.log("Testing proxy API call...");
  try {
    const testUrl = "https://www.example3.com/domains?page=1";
    console.log("Testing URL:", testUrl);

    const res = await fetch(`/api/proxy?url=${encodeURIComponent(testUrl)}`, {
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const html = data.html;

    console.log("API Response length:", html.length);

    if (html) {
      const domains = extractDomainsFromPageHtml(html);
      console.log("Extracted domains:", domains);
      alert(
        `Test thành công! Tìm thấy ${domains.length} domain từ trang test.`
      );
    } else {
      console.log("No HTML data in response");
      alert("Test thất bại: Không có HTML data trong response");
    }
  } catch (error) {
    console.error("Test API error:", error);
    alert(`Test thất bại: ${error.message}`);
  }
}

function extractLinksFromHtmlInput() {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlInput.value, "text/html");
    const links = Array.from(doc.querySelectorAll("a"));
    extractedLinks.value = links
      .map((a) => a.getAttribute("href"))
      .filter(Boolean);
  } catch (e) {
    extractedLinks.value = [];
  }
}

async function fetchAllLinksAndExtractDomainsInBatches() {
  if (!extractedLinks.value.length) return;
  const batchSize = 5;
  let batchIndex = 0;
  const totalBatches = Math.ceil(extractedLinks.value.length / batchSize);
  for (let i = 0; i < extractedLinks.value.length; i += batchSize) {
    const batchLinks = extractedLinks.value.slice(i, i + batchSize);
    // Fetch song song tất cả link trong batch
    const fetchHtml = async (url) => {
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.html;
      } catch {
        return null;
      }
    };
    const htmls = await Promise.allSettled(batchLinks.map(fetchHtml));
    // Extract domain từ từng HTML
    let allDomains = [];
    for (const result of htmls) {
      if (result.status === "fulfilled" && result.value) {
        const html = result.value;
        // Sử dụng extractDomainsFromPageHtml để lấy domain từ HTML
        const domains = extractDomainsFromPageHtml(html);
        allDomains = allDomains.concat(domains);
      }
    }
    // Lọc trùng
    const uniqueDomains = Array.from(new Set(allDomains));
    if (uniqueDomains.length) {
      const csvContent = uniqueDomains.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `domains_batch_${batchIndex + 1}_of_${totalBatches}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    batchIndex++;
    // Có thể thêm delay nhỏ giữa các batch nếu cần
    // await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  alert("Đã xuất xong tất cả file CSV cho các batch!");
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
.result.batch-message {
  color: #059669;
  background: #ecfdf5;
}
.fadein {
  animation: fadeIn 1.2s;
}
.animated {
  animation: fadeInUp 1s;
}
.batch-input-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: #f4f7ff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 18px;
  box-shadow: 0 1px 6px rgba(99, 102, 241, 0.07);
  max-width: 340px;
  width: 100%;
}
.batch-label {
  font-weight: 600;
  margin-bottom: 4px;
  color: #2d3a4a;
  display: flex;
  align-items: center;
  font-size: 1.08rem;
}
.batch-icon {
  margin-right: 6px;
  font-size: 1.2em;
}
.batch-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid #b6c6e3;
  font-size: 1.08rem;
  margin-top: 2px;
  background: #fff;
  transition: border 0.2s;
}
.batch-input:focus {
  border: 1.5px solid #6366f1;
}
.last-url-group {
  margin-top: 22px;
  background: #f4f7ff;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 6px rgba(99, 102, 241, 0.07);
  max-width: 540px;
  width: 100%;
}
.last-url-label {
  font-weight: 600;
  color: #2d3a4a;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  font-size: 1.08rem;
}
.last-url-icon {
  margin-right: 6px;
  font-size: 1.2em;
}
.last-url-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
}
.last-url-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid #b6c6e3;
  font-size: 1.02rem;
  background: #fff;
  color: #222;
}
.last-url-copy {
  padding: 10px 18px;
  border-radius: 8px;
  background: linear-gradient(90deg, #6366f1 0%, #38bdf8 100%);
  color: #fff;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 1.02rem;
  transition: background 0.2s, transform 0.15s;
}
.last-url-copy:hover {
  background: linear-gradient(90deg, #38bdf8 0%, #6366f1 100%);
  transform: translateY(-2px) scale(1.04);
}
.last-url-clear {
  padding: 10px 18px;
  border-radius: 8px;
  background: linear-gradient(90deg, #d32f2f 0%, #f87171 100%);
  color: #fff;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 1.02rem;
  transition: background 0.2s, transform 0.15s;
}
.last-url-clear:hover {
  background: linear-gradient(90deg, #f87171 0%, #d32f2f 100%);
  transform: translateY(-2px) scale(1.04);
}
@media (max-width: 600px) {
  .main-content {
    padding: 18px 4px 16px 4px;
    max-width: 98vw;
  }
  .url-input {
    width: 100%;
  }
  .submit-btn {
    width: 100%;
    margin: 0;
  }
  .result {
    max-width: 98vw;
  }
  .batch-input-group,
  .last-url-group {
    max-width: 98vw;
    padding: 10px 4px;
  }
  .last-url-row {
    flex-direction: column;
    gap: 6px;
  }
  .last-url-copy {
    width: 100%;
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
.status-panel {
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
  max-width: 540px;
  width: 100%;
  border: 1px solid #e2e8f0;
}
.status-section {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}
.status-section:last-child {
  margin-bottom: 0;
}
.status-section:hover {
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.12);
  transform: translateY(-1px);
}
.status-icon {
  font-size: 1.4em;
  margin-right: 12px;
  min-width: 24px;
  text-align: center;
}
.status-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.status-title {
  font-weight: 600;
  color: #2d3a4a;
  margin-bottom: 4px;
  font-size: 0.95rem;
}
.status-detail {
  font-size: 1rem;
  color: #4a5568;
  line-height: 1.4;
}
.url-text {
  word-break: break-all;
  color: #2563eb;
  font-family: monospace;
  font-size: 0.95rem;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 2px;
}

@media (max-width: 600px) {
  .status-panel {
    margin: 12px 8px;
    padding: 12px;
  }
  .status-section {
    padding: 10px;
  }
  .status-icon {
    font-size: 1.2em;
    margin-right: 10px;
  }
  .status-title {
    font-size: 0.9rem;
  }
  .status-detail {
    font-size: 0.95rem;
  }
  .url-text {
    font-size: 0.9rem;
    padding: 3px 6px;
  }
}
.page-input-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: #f4f7ff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 18px;
  box-shadow: 0 1px 6px rgba(99, 102, 241, 0.07);
  max-width: 340px;
  width: 100%;
}
.page-label {
  font-weight: 600;
  margin-bottom: 4px;
  color: #2d3a4a;
  display: flex;
  align-items: center;
  font-size: 1.08rem;
  font-family: monospace;
}
.page-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid #b6c6e3;
  font-size: 1.08rem;
  margin-top: 2px;
  background: #fff;
  transition: border 0.2s;
}
.page-input:focus {
  border: 1.5px solid #6366f1;
}
</style>
