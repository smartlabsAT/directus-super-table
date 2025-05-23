<template>
	<div class="file-browser-content">
		<!-- Search Bar -->
		<div class="browser-header">
			<v-input
				v-model="searchQuery"
				placeholder="Search files..."
				prepend-icon="search"
				@input="debouncedSearch"
			/>
		</div>

		<!-- Loading State -->
		<v-progress-linear v-if="loading" indeterminate />

		<!-- Files Grid -->
		<div v-else class="files-grid">
			<div
				v-for="file in files"
				:key="file.id"
				class="file-item"
				:class="{ selected: file.id === selectedFileId }"
				@click="selectFile(file)"
			>
				<!-- Image Preview -->
				<div v-if="file.type?.startsWith('image')" class="file-preview">
					<img
						:src="getFileUrl(file.id, 'system-small-cover')"
						:alt="file.title || file.filename_download"
						@error="handleImageError"
					/>
				</div>
				<!-- File Icon -->
				<div v-else class="file-icon">
					<v-icon name="insert_drive_file" large />
				</div>
				
				<!-- File Info -->
				<div class="file-info">
					<div class="file-name">{{ file.title || file.filename_download }}</div>
					<div class="file-meta">{{ formatFileSize(file.filesize) }}</div>
				</div>
			</div>
		</div>

		<!-- Pagination -->
		<div class="browser-footer">
			<v-pagination
				v-if="totalPages > 1"
				v-model="currentPage"
				:length="totalPages"
				:total-visible="5"
				@input="loadFiles"
			/>
			
			<div class="footer-actions">
				<v-button :disabled="!selectedFileId" @click="confirmSelection" :loading="selecting">
					<v-icon name="check" />
					Select
				</v-button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';

interface FileItem {
	id: string;
	title?: string;
	filename_download: string;
	filename_disk: string;
	type?: string;
	filesize?: number;
	width?: number;
	height?: number;
}

interface Props {
	collection?: string;
	fieldKey?: string;
	currentValue?: string | null;
	isImage?: boolean;
	folder?: string;
}

const props = withDefaults(defineProps<Props>(), {
	isImage: false,
	currentValue: null
});

const emit = defineEmits<{
	select: [fileId: string];
	cancel: [];
}>();

// State
const api = useApi();
const files = ref<FileItem[]>([]);
const loading = ref(false);
const selecting = ref(false);
const selectedFileId = ref<string | null>(props.currentValue);
const searchQuery = ref('');
const currentPage = ref(1);
const totalCount = ref(0);
const itemsPerPage = 24;

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / itemsPerPage));

// Methods
async function loadFiles() {
	loading.value = true;
	console.log('Loading files with params:', { 
		isImage: props.isImage, 
		folder: props.folder,
		search: searchQuery.value 
	});
	
	try {
		const params: any = {
			fields: ['id', 'title', 'filename_download', 'filename_disk', 'type', 'filesize', 'width', 'height'],
			limit: itemsPerPage,
			offset: (currentPage.value - 1) * itemsPerPage,
			sort: ['-uploaded_on'],
			meta: 'total_count'
		};
		
		// Add search filter
		if (searchQuery.value) {
			params.search = searchQuery.value;
		}
		
		// Add type filter for images
		if (props.isImage) {
			params.filter = {
				type: { _starts_with: 'image/' }
			};
		}
		
		// Add folder filter if specified
		if (props.folder) {
			params.filter = {
				...params.filter,
				folder: { _eq: props.folder }
			};
		}
		
		console.log('API request params:', params);
		const response = await api.get('/items/directus_files', { params });
		console.log('API response:', response.data);
		
		files.value = response.data.data || [];
		totalCount.value = response.data.meta?.total_count || 0;
		console.log(`Loaded ${files.value.length} files, total: ${totalCount.value}`);
		
	} catch (error) {
		console.error('Failed to load files:', error);
		console.error('Error details:', error.response?.data || error.message);
		files.value = [];
		totalCount.value = 0;
	} finally {
		loading.value = false;
	}
}

function selectFile(file: FileItem) {
	selectedFileId.value = file.id;
}

function confirmSelection() {
	if (selectedFileId.value) {
		selecting.value = true;
		setTimeout(() => {
			emit('select', selectedFileId.value);
			selecting.value = false;
		}, 100);
	}
}

function getFileUrl(fileId: string, preset = 'system-small-cover'): string {
	// Use the full URL for assets to ensure they load
	const baseUrl = window.location.origin;
	return `${baseUrl}/assets/${fileId}?key=${preset}`;
}

function formatFileSize(bytes?: number): string {
	if (!bytes) return '';
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function handleImageError(event: Event) {
	const target = event.target as HTMLImageElement;
	// Replace with placeholder icon on error
	target.style.display = 'none';
	const parent = target.parentElement;
	if (parent) {
		const icon = document.createElement('div');
		icon.innerHTML = '<v-icon name="broken_image" />';
		parent.appendChild(icon);
	}
}

// Debounced search
let searchTimeout: NodeJS.Timeout;
function debouncedSearch() {
	clearTimeout(searchTimeout);
	searchTimeout = setTimeout(() => {
		currentPage.value = 1;
		loadFiles();
	}, 300);
}

// Load files on mount
onMounted(() => {
	console.log('FileBrowserContent mounted, loading files...');
	loadFiles().then(() => {
		console.log('Files loaded:', files.value.length);
	}).catch((err) => {
		console.error('Mount load failed:', err);
	});
});
</script>

<style scoped>
.file-browser-content {
	display: flex;
	flex-direction: column;
	height: 600px;
	overflow: hidden;
}

.browser-header {
	padding: 16px;
	border-bottom: 1px solid var(--border-color);
}

.files-grid {
	flex: 1;
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 12px;
	padding: 16px;
	overflow-y: auto;
}

.file-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 12px;
	border: 2px solid transparent;
	border-radius: var(--border-radius);
	cursor: pointer;
	transition: all var(--fast) var(--transition);
}

.file-item:hover {
	background: var(--background-normal);
}

.file-item.selected {
	border-color: var(--primary);
	background: var(--primary-alt);
}

.file-preview {
	width: 100%;
	height: 80px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	border-radius: var(--border-radius);
	background: var(--background-subdued);
}

.file-preview img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.file-icon {
	width: 100%;
	height: 80px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--background-subdued);
	border-radius: var(--border-radius);
}

.file-info {
	margin-top: 8px;
	text-align: center;
	width: 100%;
}

.file-name {
	font-size: 12px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.file-meta {
	font-size: 11px;
	color: var(--foreground-subdued);
	margin-top: 2px;
}

.browser-footer {
	border-top: 1px solid var(--border-color);
	padding: 16px;
}

.footer-actions {
	display: flex;
	gap: 8px;
	justify-content: flex-end;
	margin-top: 16px;
}
</style>