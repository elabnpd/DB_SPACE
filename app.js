// ============================================================
// DB SPACE - GitHub File Manager
// Repository: ramumeyyappan/DB_SPACE
// ============================================================

const GITHUB_OWNER = "ramumeyyappan";
const GITHUB_REPO = "DB_SPACE";
const GITHUB_BRANCH = "main";
const GITHUB_FOLDER = "files";

// ============================================================
// PUT YOUR TOKEN HERE
// ============================================================

const GITHUB_TOKEN =
    "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";

// ============================================================

const API_BASE =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

const API_HEADERS = {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "X-GitHub-Api-Version": "2022-11-28"
};


// ============================================================
// START
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("DB SPACE starting...");
    console.log("Repository:", `${GITHUB_OWNER}/${GITHUB_REPO}`);

    const connected = await testGitHubConnection();

    if (connected) {
        await loadFiles();
    }

});


// ============================================================
// TEST GITHUB CONNECTION
// ============================================================

async function testGitHubConnection() {

    const status =
        document.getElementById("connectionStatus");

    try {

        status.textContent = "Connecting...";

        console.log("Testing GitHub API...");

        const response = await fetch(API_BASE, {
            method: "GET",
            headers: API_HEADERS
        });

        console.log("GitHub response:", response.status);

        const data = await response.json();

        console.log("GitHub response data:", data);

        if (!response.ok) {

            status.textContent = "❌ Connection failed";

            showStatus(
                "authStatus",
                `GitHub error ${response.status}: ${data.message || "Unknown error"}`,
                "error"
            );

            return false;
        }

        status.textContent = "🟢 Connected";

        showStatus(
            "authStatus",
            `Connected to ${data.full_name}`,
            "success"
        );

        return true;

    }
    catch (error) {

        console.error("CONNECTION ERROR:", error);

        status.textContent = "❌ Connection failed";

        showStatus(
            "authStatus",
            `Browser could not connect to GitHub API: ${error.message}`,
            "error"
        );

        return false;
    }
}


// ============================================================
// FILE SELECT
// ============================================================

function showSelectedFile() {

    const input =
        document.getElementById("fileInput");

    const display =
        document.getElementById("selectedFile");

    if (!input.files.length) {

        display.textContent = "";

        return;
    }

    const file = input.files[0];

    display.textContent =
        `Selected: ${file.name} (${formatBytes(file.size)})`;
}


// ============================================================
// UPLOAD
// ============================================================

async function uploadFile() {

    const input =
        document.getElementById("fileInput");

    if (!input.files.length) {

        showStatus(
            "uploadStatus",
            "Please select a file.",
            "error"
        );

        return;
    }

    const file =
        input.files[0];

    console.log("Uploading:", file.name);
    console.log("File size:", file.size);

    // GitHub Contents API limit
    if (file.size > 100 * 1024 * 1024) {

        showStatus(
            "uploadStatus",
            "File is larger than 100 MB.",
            "error"
        );

        return;
    }

    const button =
        document.getElementById("uploadButton");

    button.disabled = true;

    try {

        showStatus(
            "uploadStatus",
            "Reading file...",
            "info"
        );

        const base64 =
            await fileToBase64(file);

        console.log("Base64 conversion completed.");

        const encodedName =
            encodeURIComponent(file.name);

        const url =
            `${API_BASE}/contents/${GITHUB_FOLDER}/${encodedName}`;

        console.log("Upload URL:", url);

        // ====================================================
        // CHECK EXISTING FILE
        // ====================================================

        let sha = null;

        console.log("Checking whether file already exists...");

        const checkResponse =
            await fetch(
                `${url}?ref=${encodeURIComponent(GITHUB_BRANCH)}`,
                {
                    method: "GET",
                    headers: API_HEADERS
                }
            );

        console.log(
            "Existing-file response:",
            checkResponse.status
        );

        if (checkResponse.ok) {

            const existing =
                await checkResponse.json();

            sha = existing.sha;

            console.log(
                "Existing file found. SHA:",
                sha
            );

        }
        else if (
            checkResponse.status !== 404
        ) {

            const errorData =
                await safeJson(checkResponse);

            throw new Error(
                `GitHub ${checkResponse.status}: ${errorData.message || "Unable to check file"}`
            );
        }

        // ====================================================
        // UPLOAD
        // ====================================================

        showStatus(
            "uploadStatus",
            `Uploading ${file.name}...`,
            "info"
        );

        const body = {

            message:
                sha
                    ? `Update ${file.name}`
                    : `Upload ${file.name}`,

            content:
                base64,

            branch:
                GITHUB_BRANCH

        };

        if (sha) {

            body.sha = sha;

        }

        console.log("Sending upload request...");

        const response =
            await fetch(
                url,
                {
                    method: "PUT",

                    headers: {
                        ...API_HEADERS,
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(body)
                }
            );

        console.log(
            "Upload response:",
            response.status
        );

        const data =
            await safeJson(response);

        console.log(
            "Upload response data:",
            data
        );

        if (!response.ok) {

            throw new Error(
                `GitHub ${response.status}: ${data.message || "Upload failed"}`
            );

        }

        showStatus(
            "uploadStatus",
            `✅ ${file.name} uploaded successfully.`,
            "success"
        );

        input.value = "";

        document.getElementById(
            "selectedFile"
        ).textContent = "";

        await loadFiles();

    }
    catch (error) {

        console.error(
            "UPLOAD ERROR:",
            error
        );

        let message = error.message;

        if (
            error instanceof TypeError &&
            error.message === "Failed to fetch"
        ) {

            message =
                "Browser could not reach GitHub API. Check the browser console (F12), Internet connection, GitHub Pages HTTPS, and your token.";

        }

        showStatus(
            "uploadStatus",
            `❌ Upload failed: ${message}`,
            "error"
        );

    }
    finally {

        button.disabled = false;

    }
}


// ============================================================
// LOAD FILES
// ============================================================

async function loadFiles() {

    const table =
        document.getElementById("fileTable");

    table.innerHTML = `
        <tr>
            <td colspan="3" class="loading">
                Loading files...
            </td>
        </tr>
    `;

    try {

        const url =
            `${API_BASE}/contents/${GITHUB_FOLDER}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

        console.log("Loading:", url);

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: API_HEADERS
                }
            );

        const data =
            await safeJson(response);

        console.log(
            "File-list response:",
            response.status,
            data
        );

        if (response.status === 404) {

            table.innerHTML = `
                <tr>
                    <td colspan="3" class="empty">
                        No files uploaded yet.
                    </td>
                </tr>
            `;

            return;
        }

        if (!response.ok) {

            throw new Error(
                `GitHub ${response.status}: ${data.message || "Unable to load files"}`
            );
        }

        if (!Array.isArray(data)) {

            throw new Error(
                "GitHub returned an unexpected response."
            );
        }

        const files =
            data.filter(
                item => item.type === "file"
            );

        if (!files.length) {

            table.innerHTML = `
                <tr>
                    <td colspan="3" class="empty">
                        No files uploaded yet.
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML = "";

        files.forEach(file => {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td class="file-name">
                    📄 ${escapeHtml(file.name)}
                </td>

                <td>
                    ${formatBytes(file.size)}
                </td>

                <td>
                    <div class="file-actions">

                        <button
                            class="btn-primary small-btn"
                            onclick="downloadFile('${encodeURIComponent(file.name)}')"
                        >
                            ⬇ Download
                        </button>

                        <button
                            class="btn-danger small-btn"
                            onclick="deleteFile('${encodeURIComponent(file.name)}','${file.sha}')"
                        >
                            🗑 Delete
                        </button>

                    </div>
                </td>
            `;

            table.appendChild(row);

        });

    }
    catch (error) {

        console.error(
            "LOAD FILES ERROR:",
            error
        );

        table.innerHTML = `
            <tr>
                <td colspan="3" class="empty">
                    ❌ ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}


// ============================================================
// DOWNLOAD
// ============================================================

async function downloadFile(encodedName) {

    const fileName =
        decodeURIComponent(encodedName);

    try {

        showStatus(
            "uploadStatus",
            `Downloading ${fileName}...`,
            "info"
        );

        const url =
            `${API_BASE}/contents/${GITHUB_FOLDER}/${encodeURIComponent(fileName)}?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: API_HEADERS
                }
            );

        const data =
            await safeJson(response);

        if (!response.ok) {

            throw new Error(
                `GitHub ${response.status}: ${data.message || "Download failed"}`
            );
        }

        if (!data.content) {

            throw new Error(
                "GitHub did not return file content."
            );
        }

        const base64 =
            data.content.replace(/\s/g, "");

        const binary =
            atob(base64);

        const bytes =
            new Uint8Array(
                binary.length
            );

        for (
            let i = 0;
            i < binary.length;
            i++
        ) {

            bytes[i] =
                binary.charCodeAt(i);

        }

        const blob =
            new Blob(
                [bytes],
                {
                    type:
                        "application/octet-stream"
                }
            );

        const downloadUrl =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href =
            downloadUrl;

        link.download =
            fileName;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(
            downloadUrl
        );

        showStatus(
            "uploadStatus",
            `✅ ${fileName} downloaded.`,
            "success"
        );

    }
    catch (error) {

        console.error(
            "DOWNLOAD ERROR:",
            error
        );

        showStatus(
            "uploadStatus",
            `❌ Download failed: ${error.message}`,
            "error"
        );

    }
}


// ============================================================
// DELETE
// ============================================================

async function deleteFile(
    encodedName,
    sha
) {

    const fileName =
        decodeURIComponent(encodedName);

    if (
        !confirm(
            `Delete "${fileName}"?`
        )
    ) {

        return;
    }

    try {

        showStatus(
            "uploadStatus",
            `Deleting ${fileName}...`,
            "info"
        );

        const url =
            `${API_BASE}/contents/${GITHUB_FOLDER}/${encodeURIComponent(fileName)}`;

        const response =
            await fetch(
                url,
                {
                    method: "DELETE",

                    headers: {
                        ...API_HEADERS,
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            message:
                                `Delete ${fileName}`,

                            sha:
                                sha,

                            branch:
                                GITHUB_BRANCH

                        })
                }
            );

        const data =
            await safeJson(response);

        if (!response.ok) {

            throw new Error(
                `GitHub ${response.status}: ${data.message || "Delete failed"}`
            );
        }

        showStatus(
            "uploadStatus",
            `🗑 ${fileName} deleted.`,
            "success"
        );

        await loadFiles();

    }
    catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );

        showStatus(
            "uploadStatus",
            `❌ Delete failed: ${error.message}`,
            "error"
        );
    }
}


// ============================================================
// FILE → BASE64
// ============================================================

function fileToBase64(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();

            reader.onload =
                () => {

                    const result =
                        reader.result;

                    const comma =
                        result.indexOf(",");

                    resolve(
                        result.substring(
                            comma + 1
                        )
                    );
                };

            reader.onerror =
                () => {

                    reject(
                        new Error(
                            "Unable to read file."
                        )
                    );
                };

            reader.readAsDataURL(file);
        }
    );
}


// ============================================================
// SAFE JSON
// ============================================================

async function safeJson(response) {

    const text =
        await response.text();

    if (!text) {

        return {};

    }

    try {

        return JSON.parse(text);

    }
    catch {

        return {
            message: text
        };

    }
}


// ============================================================
// FILE SIZE
// ============================================================

function formatBytes(bytes) {

    if (!bytes) {

        return "0 B";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];

    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        parseFloat(
            (
                bytes /
                Math.pow(
                    1024,
                    index
                )
            ).toFixed(2)
        )
        +
        " " +
        units[index]
    );
}


// ============================================================
// STATUS
// ============================================================

function showStatus(
    elementId,
    message,
    type
) {

    const element =
        document.getElementById(
            elementId
        );

    if (!element) {

        return;
    }

    element.textContent =
        message;

    element.className =
        `status ${type}`;
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}