// Filters and Search Management
// ==============================

// Global filter state
var currentFilters = {
    type: null,
    department: null,
    condition: null,
    urgent: false,
    search: null
};

// Toggle filters panel
function toggleFilters() {
    var panel = document.getElementById('filtersPanel');
    var btnFilters = document.getElementById('btnFilters');
    if (panel) {
        var isOpen = panel.style.display !== 'none';
        panel.style.display = isOpen ? 'none' : 'block';
        
        // Add or remove click outside listener
        if (!isOpen) {
            // Panel is opening, add click outside listener
            setTimeout(function() {
                document.addEventListener('click', closeFiltersOnClickOutside);
            }, 10);
        } else {
            // Panel is closing, remove click outside listener
            document.removeEventListener('click', closeFiltersOnClickOutside);
        }
    }
}

// Close filters panel when clicking outside
function closeFiltersOnClickOutside(event) {
    var panel = document.getElementById('filtersPanel');
    var btnFilters = document.getElementById('btnFilters');
    
    if (!panel || !btnFilters) return;
    
    // Check if click is outside both panel and button
    var clickedInsidePanel = panel.contains(event.target);
    var clickedInsideButton = btnFilters.contains(event.target);
    
    if (!clickedInsidePanel && !clickedInsideButton) {
        panel.style.display = 'none';
        document.removeEventListener('click', closeFiltersOnClickOutside);
    }
}

// Apply filters
function applyFilters() {
    currentFilters.type = document.getElementById('filterType')?.value || null;
    currentFilters.department = document.getElementById('filterDepartment')?.value || null;
    currentFilters.condition = document.getElementById('filterCondition')?.value || null;
    currentFilters.urgent = document.getElementById('filterUrgent')?.checked || false;
    
    // Close filters panel
    var panel = document.getElementById('filtersPanel');
    if (panel) {
        panel.style.display = 'none';
    }
    
    // Remove click outside listener
    document.removeEventListener('click', closeFiltersOnClickOutside);
    
    // Reload items with filters
    loadItems();
}

// Clear filters
function clearFilters() {
    currentFilters = {
        type: null,
        department: null,
        condition: null,
        urgent: false,
        search: null
    };
    
    // Reset form
    if (document.getElementById('filterType')) document.getElementById('filterType').value = '';
    if (document.getElementById('filterDepartment')) document.getElementById('filterDepartment').value = '';
    if (document.getElementById('filterCondition')) document.getElementById('filterCondition').value = '';
    if (document.getElementById('filterUrgent')) document.getElementById('filterUrgent').checked = false;
    if (document.getElementById('mainSearchInput')) document.getElementById('mainSearchInput').value = '';
    
    // Close filters panel
    var panel = document.getElementById('filtersPanel');
    if (panel) {
        panel.style.display = 'none';
    }
    
    // Remove click outside listener
    document.removeEventListener('click', closeFiltersOnClickOutside);
    
    // Reload items
    loadItems();
}

// Perform search
function performSearch() {
    var searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        currentFilters.search = searchInput.value.trim() || null;
        loadItems();
    }
}

// Handle Enter key in search input
document.addEventListener('DOMContentLoaded', function() {
    var searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

