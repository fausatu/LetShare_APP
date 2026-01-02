// Translation System
// ==================

// Translations for main page
const translations = {
    en: {
        heroTitle: "Looking for something?<br>Get it from your mates",
        searchPlaceholder: "Search books, materials, notes...",
        search: "Search",
        addNewItem: "Add New Item",
        title: "Title",
        enterItemTitle: "Enter item title",
        type: "Type",
        selectType: "Select type",
        donation: "Donation",
        exchange: "Exchange",
        major: "Major",
        selectMajor: "Select major",
        selectMajorOptional: "Leave empty to use your department",
        departmentHint: "Optional: Specify if this item is from a different major than yours",
        description: "Description",
        enterDescription: "Enter item description",
        image: "Image",
        uploadImage: "Upload Image",
        addItem: "Add Item",
        reviews: "Reviews",
        requestExchange: "Request Exchange",
        sendMessageTo: "Send a message to",
        toProposeExchange: "to propose an exchange",
        yourMessage: "Your message",
        messagePlaceholder: "Hi! I'd like to exchange this for [your item]. When and where can we meet?",
        sendRequest: "Send Request",
        iWantThis: "I want this",
        requestAlreadySent: "Request Already Sent",
        viewDetails: "View details",
        requests: "Requests",
        myProfile: "My Profile",
        noMessages: "No messages yet",
        conversationsWillAppear: "Your conversations will appear here",
        backToMessages: "Back to messages",
        requestFrom: "Request from:",
        to: "To:",
        typeMessage: "Type a message...",
        acceptRequest: "Accept Request",
        reject: "Reject",
        confirmItemReceived: "Confirm Item Received",
        noMessagesYet: "No messages yet. Start the conversation!",
        itemAdded: "Item added successfully!",
        requestSent: "Request sent! Check your messages.",
        cantRequestOwn: "You can't request your own item!",
        pleaseEnterMessage: "Please enter a message",
        joinCommunity: "Join the community",
        register: "Register",
        login: "Login",
        member: "member",
        members: "members"
    },
    fr: {
        heroTitle: "Vous cherchez quelque chose ?<br>Obtenez-le de vos camarades",
        searchPlaceholder: "Rechercher des livres, matériels, notes...",
        search: "Rechercher",
        addNewItem: "Ajouter un nouvel article",
        title: "Titre",
        enterItemTitle: "Entrez le titre de l'article",
        type: "Type",
        selectType: "Sélectionner le type",
        donation: "Don",
        exchange: "Échange",
        major: "Filière",
        selectMajor: "Sélectionner la filière",
        selectMajorOptional: "Laisser vide pour utiliser votre filière",
        departmentHint: "Optionnel : Spécifier si cet article est d'une filière différente de la vôtre",
        description: "Description",
        enterDescription: "Entrez la description de l'article",
        image: "Image",
        uploadImage: "Télécharger une image",
        addItem: "Ajouter l'article",
        reviews: "Avis",
        requestExchange: "Demander un échange",
        sendMessageTo: "Envoyer un message à",
        toProposeExchange: "pour proposer un échange",
        yourMessage: "Votre message",
        messagePlaceholder: "Salut ! J'aimerais échanger ceci contre [votre article]. Quand et où pouvons-nous nous rencontrer ?",
        sendRequest: "Envoyer la demande",
        iWantThis: "Je veux ça",
        requestAlreadySent: "Demande déjà envoyée",
        viewDetails: "Voir les détails",
        requests: "Demandes",
        myProfile: "Mon profil",
        noMessages: "Aucun message pour le moment",
        conversationsWillAppear: "Vos conversations apparaîtront ici",
        backToMessages: "Retour aux messages",
        requestFrom: "Demande de :",
        to: "À :",
        typeMessage: "Tapez un message...",
        acceptRequest: "Accepter la demande",
        reject: "Refuser",
        confirmItemReceived: "Confirmer la réception",
        noMessagesYet: "Aucun message pour le moment. Commencez la conversation !",
        itemAdded: "Article ajouté avec succès !",
        requestSent: "Demande envoyée ! Vérifiez vos messages.",
        cantRequestOwn: "Vous ne pouvez pas demander votre propre article !",
        pleaseEnterMessage: "Veuillez entrer un message",
        joinCommunity: "Rejoindre la communauté",
        register: "Inscription",
        login: "Connexion",
        member: "membre",
        members: "membres"
    }
};

// Get current language
function getCurrentLanguage() {
    var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    return settings.language || 'en';
}

// Get translation
function t(key) {
    var lang = getCurrentLanguage();
    return translations[lang] && translations[lang][key] ? translations[lang][key] : translations.en[key] || key;
}

// Apply translations to page
function applyTranslations() {
    var lang = getCurrentLanguage();
    document.documentElement.lang = lang;
    
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        var translation = t(key);
        if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'password')) {
            // Keep placeholder if it has data-i18n-placeholder
            if (!el.hasAttribute('data-i18n-placeholder')) {
                el.placeholder = translation;
            }
        } else if (el.tagName === 'TEXTAREA') {
            if (!el.hasAttribute('data-i18n-placeholder')) {
                el.placeholder = translation;
            }
        } else if (el.tagName === 'INPUT' && el.type === 'submit' || el.tagName === 'BUTTON' || el.tagName === 'A') {
            var svg = el.querySelector('svg');
            if (svg) {
                el.innerHTML = '';
                el.appendChild(svg);
                el.appendChild(document.createTextNode(translation));
            } else {
                el.textContent = translation;
            }
        } else {
            el.innerHTML = translation;
        }
    });
    
    // Translate elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    // Translate specific elements by ID or class
    var heroTitle = document.querySelector('.hero h2');
    if (heroTitle && !heroTitle.hasAttribute('data-i18n')) {
        heroTitle.innerHTML = t('heroTitle');
    }
    
    var searchInput = document.querySelector('.search-input');
    if (searchInput && !searchInput.hasAttribute('data-i18n-placeholder')) {
        searchInput.placeholder = t('searchPlaceholder');
    }
    
    var searchBtn = document.querySelector('.btn-search');
    if (searchBtn && !searchBtn.hasAttribute('data-i18n')) {
        var svg = searchBtn.querySelector('svg');
        searchBtn.innerHTML = '';
        if (svg) searchBtn.appendChild(svg);
        searchBtn.appendChild(document.createTextNode(t('search')));
    }
    
    // Translate modal elements
    var addModalTitle = document.querySelector('#addModal h2');
    if (addModalTitle) {
        addModalTitle.textContent = t('addNewItem');
    }
    
    var modalLabels = document.querySelectorAll('#addModal .form-label');
    if (modalLabels.length > 0) {
        var labels = ['title', 'type', 'description', 'image', 'condition'];
        modalLabels.forEach(function(label, index) {
            if (labels[index]) {
                label.textContent = t(labels[index]);
            }
        });
    }
    
    var modalPlaceholders = document.querySelectorAll('#addModal .form-input, #addModal .form-select, #addModal .form-textarea');
    if (modalPlaceholders.length > 0) {
        var placeholders = ['enterItemTitle', 'selectType', 'enterDescription'];
        modalPlaceholders.forEach(function(input, index) {
            if (placeholders[index] && input.placeholder) {
                input.placeholder = t(placeholders[index]);
            }
        });
    }
    
    var addItemBtn = document.querySelector('#addItemForm button[type="submit"]');
    if (addItemBtn) {
        addItemBtn.textContent = t('addItem');
    }
}

