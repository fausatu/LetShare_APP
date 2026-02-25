// Translation System
// ==================

// Translations for main page
const translations = {
    en: {
        heroTitle: "Give, exchange what you don't need,<br>find what you do!",
        heroSubtitle: "Student Exchange Platform: donate, trade and share books, materials and course notes",
        searchPlaceholder: "Search books, materials, notes...",
        search: "Search",
        termsModalTitleFirst: "📋 Acceptance Required",
        termsModalTextFirst: "To use Letshare, you must read and accept our Terms of Service and Privacy Policy.",
        termsModalTitleUpdate: "📋 Terms Updated",
        termsModalTextUpdate: "Our Terms of Service and Privacy Policy have been updated. Please read and accept them to continue.",
        declutterHelp: "Declutter & Help Others",
        joinCommunity: "Join the Community",
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
        published: "Published",
        departmentHint: "Optional: Specify if this item is from a different major than yours",
        description: "Description",
        enterDescription: "Enter item description",
        image: "Image",
        images: "Images",
        enterImageUrl: "Or enter image URL (optional)",
        addUrl: "Add URL",
        orUploadImages: "Or upload images (multiple allowed)",
        clickToUpload: "Click to upload images",
        condition: "Condition",
        selectCondition: "Select condition (optional)",
        conditionNew: "New",
        conditionExcellent: "Excellent",
        conditionGood: "Good",
        conditionFair: "Fair",
        conditionPoor: "Poor",
        markAsUrgent: "Mark as urgent",
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
        members: "members",
        noItemsTitle: "No posts available",
        noItemsMessage: "There are no posts to display at the moment. Check back later!",
        // Notifications
        itemDeletedSuccess: "Item deleted successfully!",
        failedToDeleteItem: "Failed to delete item.",
        errorDeletingItem: "Error deleting item. Please try again.",
        errorLoadingItems: "Error loading items",
        pleaseTryAgainLater: "Please try again later",
        errorLoadingMessages: "Error loading messages",
        requestAccepted: "Request accepted.",
        errorAcceptingRequest: "Error accepting request. Please try again.",
        errorSendingMessage: "Error sending message. Please try again.",
        errorReloadingConversation: "Error reloading conversation. Please try again.",
        interestedItemRemoved: "Item removed from interested list!",
        failedToRemoveInterested: "Failed to remove item from interested list.",
        errorRemovingInterested: "Error removing item. Please try again.",
        newMessage: "New message",
        newRequest: "New request",
        requestAccepted: "Request accepted",
        requestRejected: "Request rejected",
        exchangeCompleted: "Exchange completed",
        newReview: "New review",
        itemDeleted: "Item deleted",
        conversationCancelled: "Conversation cancelled",
        confirmationNeeded: "Confirmation Needed",
        exchangeAutoCompleted: "Exchange Auto Completed",
        exchangeReminder: "Exchange Confirmation Reminder",
        itemNoLongerAvailable: "Item No Longer Available",
        notifications: "Notifications",
        noNotifications: "No notifications yet",
        loadingNotifications: "Loading notifications...",
        errorLoadingNotifications: "Error loading notifications",
        errorLoadingMessages: "Error loading messages",
        markAllAsRead: "Mark all as read",
        // Notification message translations
        interestedInDonation: "is interested in your donation:",
        interestedInLoan: "is interested in your loan:",
        interestedInItem: "is interested in:",
        requestAcceptedMsg: "Your request for",
        requestRejectedMsg: "Your request for",
        requestNoLongerAvailableMsg: "is no longer available as another request has been accepted.",
        reviewReceived: "left you a review for",
        confirmationNeededMsg: "Your exchange partner has confirmed completion. Please confirm on your side too.",
        // Profile page
        settings: "Settings",
        back: "Back",
        financeMajor: "Finance Major",
        itemsPosted: "Items Posted",
        itemsInterested: "Items Interested",
        exchangesDone: "Exchanges Done",
        myPosts: "My Posts",
        interested: "Interested",
        history: "History",
        noInterestedItems: "No interested items yet",
        interestedItemsDesc: "Items you mark as interested will appear here",
        noRequestYet: "No request yet",
        requestsDesc: "Your requests will appear here",
        noHistoryYet: "No history yet",
        historyDesc: "Your completed exchanges will appear here",
        majorSuffix: "Major",
        // Settings page
        manageAccountSettings: "Manage your account settings and preferences",
        profileSection: "Profile",
        changePhoto: "Change Photo",
        fullName: "Full Name",
        enterFullName: "Enter your full name",
        emailLabel: "Email",
        enterEmail: "Enter your email",
        departmentMajor: "Department / Major",
        saveChanges: "Save Changes",
        notificationsSection: "Notifications",
        newMessagesLabel: "New Messages",
        newMessagesDesc: "Get notified when you receive new messages",
        newRequestsLabel: "New Requests",
        newRequestsDesc: "Get notified when someone requests your items",
        requestAcceptedLabel: "Request Accepted",
        requestAcceptedDesc: "Get notified when your request is accepted",
        newReviewsLabel: "New Reviews",
        newReviewsDesc: "Get notified when you receive a new review",
        browserPushLabel: "Browser Push Notifications",
        browserPushDesc: "Receive notifications even when the site is closed",
        sendTestNotification: "Send Test Notification",
        privacySection: "Privacy",
        showDepartmentLabel: "Show Department",
        showDepartmentDesc: "Display your department on your profile",
        showEmailLabel: "Show Email",
        showEmailDesc: "Display your email address on your profile",
        showRatingLabel: "Show Rating",
        showRatingDesc: "Display your rating on your profile",
        conversationSection: "Conversation Management",
        autoDeleteRejectedLabel: "Auto-delete Rejected Requests",
        autoDeleteRejectedDesc: "Automatically delete conversations when your request is rejected or becomes unavailable",
        preferencesSection: "Preferences",
        languageLabel: "Language",
        languageDesc: "Choose your preferred language",
        english: "English",
        french: "French",
        themeLabel: "Theme",
        themeDesc: "Choose your preferred theme",
        light: "Light",
        dark: "Dark",
        emailNotificationsSection: "Email Notifications",
        weeklyDigestLabel: "Weekly Digest",
        weeklyDigestDesc: "Receive a weekly summary of your activity",
        marketingEmailsLabel: "Marketing Emails",
        marketingEmailsDesc: "Receive updates about new features and tips",
        securitySection: "Security",
        changePassword: "Change Password",
        changePasswordDesc: "Update your password to keep your account secure",
        twoFactorLabel: "Two-Factor Authentication",
        twoFactorDesc: "Add an extra layer of security to your account",
        enable: "Enable",
        dangerZone: "Danger Zone",
        deleteAccountLabel: "Delete Account",
        deleteAccountDesc: "Permanently delete your account and all your data",
        deleteAccount: "Delete Account",
        backToProfile: "Back to Profile",
        account: "Account",
        currentPassword: "Current Password",
        enterCurrentPassword: "Enter current password",
        newPassword: "New Password",
        enterNewPassword: "Enter new password",
        confirmNewPassword: "Confirm New Password",
        confirmNewPasswordPlaceholder: "Confirm new password",
        changePasswordBtn: "Change Password",
        logout: "Logout",
        signOutDesc: "Sign out of your account",
        dataManagement: "Data Management",
        exportMyData: "Export My Data",
        exportDataDesc: "Download a copy of all your data",
        exportBtn: "Export",
        about: "About",
        appVersion: "App Version",
        appVersionText: "LetShare v1.0.0",
        helpSupport: "Help & Support",
        helpSupportDesc: "Get help or contact support",
        contact: "Contact",
        termsOfService: "Terms of Service",
        termsOfServiceDesc: "Read our terms and conditions",
        viewBtn: "View",
        // Terms modal
        termsUpdatedTitle: "📋 Terms and Conditions Updated",
        termsUpdatedText: "Our Terms of Service and Privacy Policy have been updated. To continue using Letshare, please read and accept them.",
        documentsToReview: "Documents to review:",
        termsOfService: "📄 Terms of Service",
        privacyPolicy: "🔒 Privacy Policy",
        acceptTermsTextModal: "I have read and accept the Terms of Service and Privacy Policy",
        acceptAndContinue: "Accept and Continue",
        decline: "Decline",
        declineWarning: "By declining, you will be logged out and cannot use Letshare.",
        saving: "Saving...",
        termsAcceptedSuccess: "✓ Terms accepted successfully",
        confirmDeclineTerms: "By declining the terms, you will be logged out. Are you sure?",
        andText: " and the ",
        privacyPolicy: "Privacy Policy",
        privacyPolicyDesc: "Learn how we protect your data",
        deleteAccountDescFull: "Permanently delete your account and all associated data",
        // Settings page
        preferencesSaved: "Preferences saved!",
        profileUpdated: "Profile updated successfully!",
        avatarUpdated: "Avatar updated!",
        passwordChanged: "Password changed successfully!",
        dataExported: "Data exported successfully!",
        accountDeleted: "Account deleted. Redirecting...",
        fillAllFields: "Please fill all fields",
        passwordsNoMatch: "New passwords do not match",
        passwordTooShort: "Password must be at least 6 characters",
        termsAcceptance: "Terms Acceptance",
        loadingTermsInfo: "Loading...",
        termsAcceptedOn: "You accepted the terms on",
        downloadPdfBtn: "PDF",
        // Modal translations
        rejectRequestTitle: "Reject Request",
        rejectRequestConfirm: "Are you sure you want to reject this request for",
        actionCannotBeUndone: "This action cannot be undone",
        requesterWillBeNotified: "The requester will be notified that their request has been rejected.",
        cancel: "Cancel",
        rejectRequest: "Reject Request",
        deleteConversationTitle: "Delete Conversation",
        deleteConversationConfirm: "Are you sure you want to delete this conversation about",
        hideOnlyForYou: "This will only hide it for you",
        otherPersonCanStillSee: "The other person will still be able to see the conversation and send messages.",
        deleteConversation: "Delete Conversation",

        //notifications
        tryAgain: "Please try again"
    },
    fr: {
        heroTitle: "Donnez, échangez ce dont vous n'avez plus besoin,<br>trouvez ce qu'il vous faut !",
        heroSubtitle: "Plateforme d'échange entre étudiants : donnez, troquez et partagez livres, matériel et notes de cours",
        searchPlaceholder: "Rechercher des livres, matériels, notes...",
        itemDeletedSuccess: "Article supprimé avec succès !",
        failedToDeleteItem: "Échec de la suppression de l'article.",
        errorDeletingItem: "Erreur lors de la suppression de l'article. Veuillez réessayer.",
        errorLoadingItems: "Erreur lors du chargement des articles",
        pleaseTryAgainLater: "Veuillez réessayer plus tard",
        errorLoadingMessages: "Erreur lors du chargement des messages",
        requestAccepted: "Demande acceptée.",
        errorAcceptingRequest: "Erreur lors de l'acceptation de la demande. Veuillez réessayer.",
        errorSendingMessage: "Erreur lors de l'envoi du message. Veuillez réessayer.",
        errorReloadingConversation: "Erreur lors du rechargement de la conversation. Veuillez réessayer.",
        search: "Rechercher",
        interestedItemRemoved: "Article retiré de la liste des intéressés !",
        failedToRemoveInterested: "Échec du retrait de l'article de la liste des intéressés.",
        errorRemovingInterested: "Erreur lors du retrait de l'article. Veuillez réessayer.",
        termsModalTitleFirst: "📋 Acceptation requise",
        termsModalTextFirst: "Pour utiliser Letshare, vous devez lire et accepter nos Conditions Générales d'Utilisation et notre Politique de confidentialité.",
        termsModalTitleUpdate: "📋 Conditions mises à jour",
        termsModalTextUpdate: "Nos CGU et Politique de confidentialité ont été mises à jour. Veuillez les lire et les accepter pour continuer.",
        declutterHelp: "Désencombrer & Aider les Autres",
        joinCommunity: "Rejoindre la Communauté",
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
        published: "Publié",
        departmentHint: "Optionnel : Spécifier si cet article est d'une filière différente de la vôtre",
        description: "Description",
        enterDescription: "Entrez la description de l'article",
        image: "Image",
        images: "Images",
        enterImageUrl: "Ou entrez l'URL de l'image (optionnel)",
        addUrl: "Ajouter URL",
        orUploadImages: "Ou télécharger des images (plusieurs autorisées)",
        clickToUpload: "Cliquez pour télécharger des images",
        condition: "État",
        selectCondition: "Sélectionner l'état (optionnel)",
        conditionNew: "Neuf",
        conditionExcellent: "Excellent",
        conditionGood: "Bon",
        conditionFair: "Passable",
        conditionPoor: "Mauvais",
        markAsUrgent: "Marquer comme urgent",
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
        members: "membres",
        noItemsTitle: "Aucun post disponible",
        noItemsMessage: "Il n'y a aucun post à afficher pour le moment. Revenez plus tard !",
        // Notifications
        newMessage: "Nouveau message",
        newRequest: "Nouvelle demande",
        requestAccepted: "Demande acceptée",
        requestRejected: "Demande refusée",
        exchangeCompleted: "Échange terminé",
        newReview: "Nouvel avis",
        itemDeleted: "Article supprimé",
        conversationCancelled: "Conversation annulée",
        confirmationNeeded: "Confirmation requise",
        exchangeAutoCompleted: "Échange complété automatiquement",
        exchangeReminder: "Rappel de confirmation d'échange",
        itemNoLongerAvailable: "Article non disponible",
        notifications: "Notifications",
        noNotifications: "Aucune notification pour le moment",
        loadingNotifications: "Chargement des notifications...",
        errorLoadingNotifications: "Erreur de chargement des notifications",
        errorLoadingMessages: "Erreur de chargement des messages",
        markAllAsRead: "Tout marquer comme lu",
        // Notification message translations
        interestedInDonation: "est intéressé(e) par votre don :",
        interestedInLoan: "est intéressé(e) par votre prêt :",
        interestedInItem: "est intéressé(e) par :",
        requestAcceptedMsg: "Votre demande pour",
        requestRejectedMsg: "Votre demande pour",
        requestNoLongerAvailableMsg: "n'est plus disponible car une autre demande a été acceptée.",
        reviewReceived: "vous a laissé un avis pour",
        confirmationNeededMsg: "Votre partenaire d'échange a confirmé. Merci de confirmer de votre côté également.",
        // Profile page
        settings: "Paramètres",
        back: "Retour",
        financeMajor: "Filière Finance",
        itemsPosted: "Articles postés",
        itemsInterested: "Articles intéressés",
        exchangesDone: "Échanges effectués",
        myPosts: "Mes posts",
        interested: "Intéressé",
        history: "Historique",
        noInterestedItems: "Aucun article intéressé pour le moment",
        interestedItemsDesc: "Les articles que vous marquez comme intéressés apparaîtront ici",
        noRequestYet: "Aucune demande pour le moment",
        requestsDesc: "Vos demandes apparaîtront ici",
        noHistoryYet: "Aucun historique pour le moment",
        historyDesc: "Vos échanges terminés apparaîtront ici",
        majorSuffix: "Filière",
        // Settings page
        manageAccountSettings: "Gérer les paramètres de votre compte et vos préférences",
        profileSection: "Profil",
        changePhoto: "Changer la photo",
        fullName: "Nom complet",
        enterFullName: "Entrez votre nom complet",
        emailLabel: "Email",
        enterEmail: "Entrez votre email",
        departmentMajor: "Département / Filière",
        saveChanges: "Enregistrer les modifications",
        notificationsSection: "Notifications",
        newMessagesLabel: "Nouveaux messages",
        newMessagesDesc: "Recevoir une notification lors de nouveaux messages",
        newRequestsLabel: "Nouvelles demandes",
        newRequestsDesc: "Recevoir une notification lorsque quelqu'un demande vos articles",
        requestAcceptedLabel: "Demande acceptée",
        requestAcceptedDesc: "Recevoir une notification lorsque votre demande est acceptée",
        newReviewsLabel: "Nouveaux avis",
        newReviewsDesc: "Recevoir une notification lors de nouveaux avis",
        browserPushLabel: "Notifications push du navigateur",
        browserPushDesc: "Recevoir des notifications même lorsque le site est fermé",
        sendTestNotification: "Envoyer une notification de test",
        privacySection: "Confidentialité",
        showDepartmentLabel: "Afficher le département",
        showDepartmentDesc: "Afficher votre département sur votre profil",
        showEmailLabel: "Afficher l'email",
        showEmailDesc: "Afficher votre adresse email sur votre profil",
        showRatingLabel: "Afficher la note",
        showRatingDesc: "Afficher votre note sur votre profil",
        conversationSection: "Gestion des conversations",
        autoDeleteRejectedLabel: "Supprimer auto les demandes rejetées",
        autoDeleteRejectedDesc: "Supprimer automatiquement les conversations quand votre demande est rejetée ou n'est plus disponible",
        preferencesSection: "Préférences",
        languageLabel: "Langue",
        languageDesc: "Choisissez votre langue préférée",
        english: "Anglais",
        french: "Français",
        themeLabel: "Thème",
        themeDesc: "Choisissez votre thème préféré",
        light: "Clair",
        dark: "Sombre",
        emailNotificationsSection: "Notifications par email",
        weeklyDigestLabel: "Résumé hebdomadaire",
        weeklyDigestDesc: "Recevoir un résumé hebdomadaire de votre activité",
        marketingEmailsLabel: "Emails marketing",
        marketingEmailsDesc: "Recevoir des mises à jour sur les nouvelles fonctionnalités et conseils",
        securitySection: "Sécurité",
        changePassword: "Changer le mot de passe",
        changePasswordDesc: "Mettez à jour votre mot de passe pour sécuriser votre compte",
        twoFactorLabel: "Authentification à deux facteurs",
        twoFactorDesc: "Ajouter une couche de sécurité supplémentaire à votre compte",
        enable: "Activer",
        dangerZone: "Zone de danger",
        deleteAccountLabel: "Supprimer le compte",
        deleteAccountDesc: "Supprimer définitivement votre compte et toutes vos données",
        deleteAccount: "Supprimer le compte",
        backToProfile: "Retour au profil",
        account: "Compte",
        currentPassword: "Mot de passe actuel",
        enterCurrentPassword: "Entrez le mot de passe actuel",
        newPassword: "Nouveau mot de passe",
        enterNewPassword: "Entrez le nouveau mot de passe",
        confirmNewPassword: "Confirmer le nouveau mot de passe",
        confirmNewPasswordPlaceholder: "Confirmez le nouveau mot de passe",
        changePasswordBtn: "Changer le mot de passe",
        logout: "Déconnexion",
        signOutDesc: "Déconnectez-vous de votre compte",
        dataManagement: "Gestion des données",
        exportMyData: "Exporter mes données",
        exportDataDesc: "Télécharger une copie de toutes vos données",
        exportBtn: "Exporter",
        about: "À propos",
        appVersion: "Version de l'application",
        appVersionText: "LetShare v1.0.0",
        helpSupport: "Aide & Support",
        helpSupportDesc: "Obtenir de l'aide ou contacter le support",
        contact: "Contacter",
        termsOfService: "Conditions d'utilisation",
        termsOfServiceDesc: "Lire nos termes et conditions",
        viewBtn: "Voir",
        termsAcceptance: "Acceptation des conditions",
        loadingTermsInfo: "Chargement...",
        termsAcceptedOn: "Vous avez accepté les conditions le",
        downloadPdfBtn: "PDF",
        // Terms modal
        termsUpdatedTitle: "📋 Conditions d'utilisation mises à jour",
        termsUpdatedText: "Nos Conditions Générales d'Utilisation et notre Politique de confidentialité ont été mises à jour. Pour continuer à utiliser Letshare, veuillez les lire et les accepter.",
        documentsToReview: "Documents à consulter :",
        termsOfService: "📄 Conditions Générales d'Utilisation",
        privacyPolicy: "🔒 Politique de confidentialité",
        acceptTermsTextModal: "J'ai lu et j'accepte les Conditions Générales d'Utilisation et la Politique de confidentialité",
        acceptAndContinue: "Accepter et continuer",
        decline: "Refuser",
        declineWarning: "En refusant, vous serez déconnecté et ne pourrez pas utiliser Letshare.",
        saving: "Enregistrement...",
        termsAcceptedSuccess: "✓ Conditions acceptées avec succès",
        confirmDeclineTerms: "En refusant les conditions, vous serez déconnecté. Êtes-vous sûr ?",
        andText: " et la ",
        privacyPolicy: "Politique de confidentialité",
        privacyPolicyDesc: "Découvrez comment nous protégeons vos données",
        deleteAccountDescFull: "Supprimer définitivement votre compte et toutes les données associées",
        // Settings page
        preferencesSaved: "Préférences enregistrées !",
        profileUpdated: "Profil mis à jour avec succès !",
        avatarUpdated: "Avatar mis à jour !",
        passwordChanged: "Mot de passe modifié avec succès !",
        dataExported: "Données exportées avec succès !",
        accountDeleted: "Compte supprimé. Redirection...",
        fillAllFields: "Veuillez remplir tous les champs",
        passwordsNoMatch: "Les nouveaux mots de passe ne correspondent pas",
        passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
        // Modal translations
        rejectRequestTitle: "Refuser la demande",
        rejectRequestConfirm: "Êtes-vous sûr de vouloir refuser cette demande pour",
        actionCannotBeUndone: "Cette action est irréversible",
        requesterWillBeNotified: "Le demandeur sera notifié que sa demande a été refusée.",
        cancel: "Annuler",
        rejectRequest: "Refuser la demande",
        deleteConversationTitle: "Supprimer la conversation",
        deleteConversationConfirm: "Êtes-vous sûr de vouloir supprimer cette conversation à propos de",
        hideOnlyForYou: "Cela ne la masquera que pour vous",
        otherPersonCanStillSee: "L'autre personne pourra toujours voir la conversation et envoyer des messages.",
        deleteConversation: "Supprimer la conversation",

        //notifications
        tryAgain: "Veuillez Réessayer",
    }
};

// Get current language
function getCurrentLanguage() {
    try {
        var settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
        if (settings.language) {
            return settings.language;
        }
    } catch (e) {
        // Continue with browser language detection
    }
    
    // Fallback: detect browser language
    var browserLang = navigator.language || navigator.userLanguage;
    
    // Extract language code (e.g., 'fr' from 'fr-FR')
    var langCode = (browserLang ? browserLang.split('-')[0].toLowerCase() : 'en');
    
    // Check if we support this language
    var supportedLangs = ['en', 'fr'];
    if (supportedLangs.includes(langCode)) {
        return langCode;
    }
    
    return 'en';
}

// Translate notification titles
function translateNotificationTitle(title) {
    var titleMap = {
        'New message': 'newMessage',
        'Nouveau message': 'newMessage',
        'New request': 'newRequest',
        'Nouvelle demande': 'newRequest',
        'New request received': 'newRequest',
        'Request accepted': 'requestAccepted',
        'Demande acceptée': 'requestAccepted',
        'Request rejected': 'requestRejected',
        'Demande refusée': 'requestRejected',
        'Exchange completed': 'exchangeCompleted',
        'Échange terminé': 'exchangeCompleted',
        'New review': 'newReview',
        'Nouvel avis': 'newReview',
        'Item deleted': 'itemDeleted',
        'Article supprimé': 'itemDeleted',
        'Conversation cancelled': 'conversationCancelled',
        'Conversation annulée': 'conversationCancelled',
        'Confirmation Needed': 'confirmationNeeded',
        'Confirmation requise': 'confirmationNeeded',
        'Exchange Auto Completed': 'exchangeAutoCompleted',
        'Échange complété automatiquement': 'exchangeAutoCompleted',
        'Exchange Confirmation Reminder': 'exchangeReminder',
        'Rappel de confirmation d\'échange': 'exchangeReminder',
        'Item No Longer Available': 'itemNoLongerAvailable',
        'Article non disponible': 'itemNoLongerAvailable'
    };
    
    var key = titleMap[title];
    return key ? t(key) : title;
}

// Translate notification messages
function translateNotificationMessage(message) {
    if (!message) return message;
    
    // Pattern 1: "{name} is interested in your donation: {item}"
    var match1EN = message.match(/^(.+) is interested in your donation: (.+)$/);
    if (match1EN) {
        return match1EN[1] + ' ' + t('interestedInDonation') + ' ' + match1EN[2];
    }
    
    // Pattern 1 FR: "{name} est intéressé(e) par votre don : {item}"
    var match1FR = message.match(/^(.+) est intéressé\(e\) par votre don : (.+)$/);
    if (match1FR) {
        return match1FR[1] + ' ' + t('interestedInDonation') + ' ' + match1FR[2];
    }
    
    // Pattern 2: "{name} is interested in your loan: {item}"
    var match2EN = message.match(/^(.+) is interested in your loan: (.+)$/);
    if (match2EN) {
        return match2EN[1] + ' ' + t('interestedInLoan') + ' ' + match2EN[2];
    }
    
    // Pattern 2 FR: "{name} est intéressé(e) par votre prêt : {item}"
    var match2FR = message.match(/^(.+) est intéressé\(e\) par votre prêt : (.+)$/);
    if (match2FR) {
        return match2FR[1] + ' ' + t('interestedInLoan') + ' ' + match2FR[2];
    }
    
    // Pattern 3: "Your request for \"{item}\" has been accepted!"
    var match3EN = message.match(/^Your request for "(.+)" has been accepted!$/);
    if (match3EN) {
        return t('requestAcceptedMsg') + ' "' + match3EN[1] + '"';
    }
    
    // Pattern 3 FR: "Votre demande pour \"{item}\" a été acceptée !"
    var match3FR = message.match(/^Votre demande pour "(.+)" a été acceptée !$/);
    if (match3FR) {
        return t('requestAcceptedMsg') + ' "' + match3FR[1] + '"';
    }
    
    // Pattern 4: "Your request for \"{item}\" has been rejected"
    var match4EN = message.match(/^Your request for "(.+)" has been rejected$/);
    if (match4EN) {
        return t('requestRejectedMsg') + ' "' + match4EN[1] + '"';
    }
    
    // Pattern 4 FR: "Votre demande pour \"{item}\" a été refusée"
    var match4FR = message.match(/^Votre demande pour "(.+)" a été refusée$/);
    if (match4FR) {
        return t('requestRejectedMsg') + ' "' + match4FR[1] + '"';
    }
    
    // If no pattern matches, return original message
    return message;
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

    // Nouvelle logique : chaque label/input avec data-i18n ou data-i18n-placeholder est traduit individuellement
    document.querySelectorAll('#addModal [data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (key) el.textContent = t(key);
    });
    document.querySelectorAll('#addModal [data-i18n-placeholder]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-placeholder');
        if (key) el.placeholder = t(key);
    });
    
    var addItemBtn = document.querySelector('#addItemForm button[type="submit"]');
    if (addItemBtn) {
        addItemBtn.textContent = t('addItem');
    }
}

