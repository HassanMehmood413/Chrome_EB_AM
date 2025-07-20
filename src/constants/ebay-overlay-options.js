export const ebayOverlayOptions = {
    allSellerSoldItem: {
        label: "All Seller's Sold Items",
        icon: "https://i.imgur.com/kSJM6qx.png",
    },
    whatTheySold: {
        label: "How Many They Sold",
        icon: "https://i.imgur.com/OkBGoHv.png",
    },
    copyInfo: {
        label: 'Copy Info',
        icon: "https://i.imgur.com/5FFvcTn.png"
    },
    sendSellerToScanner: {
        label: 'Send Seller to Scanner',
        icon: "https://i.imgur.com/XL4inzI.png"
    },
    searchTitleActive: {
        label: 'Search Title (Active)',
        icon: "https://i.imgur.com/1MM3gmC.png"
    },
    searchTitleSold: {
        label: 'Search Title (Sold)',
        icon: "https://i.imgur.com/DnYzPkD.png"
    },
    amazon: {
        label: 'Search on Amazon',
        icon: "https://i.imgur.com/vBMlcAQ.png"
    },
    googleImages: {
        label: 'Search on Google Images',
        icon: "https://i.imgur.com/2G5FWiK.png"
    },
}

export const countryConfigurations = {
    USA: {
        defaultSections: [
            { id: 1, title: 'Shipping Information', content: 'Fast and free shipping across the USA!', enabled: true },
            { id: 2, title: 'Return Policy', content: '30-day hassle-free returns', enabled: true },
            { id: 3, title: 'Product Features', content: 'High-quality product with excellent features', enabled: true },
            { id: 4, title: 'Customer Service', content: '24/7 customer support available', enabled: true },
            { id: 5, title: 'Warranty', content: 'Full manufacturer warranty included', enabled: true },
            { id: 6, title: 'Compatibility', content: 'Compatible with all major devices', enabled: true },
            { id: 7, title: 'Additional Info', content: 'Contact us for bulk orders', enabled: true }
        ],
        listingText: 'Thank you for choosing our store! We ship fast and provide excellent customer service.'
    },
    UK: {
        defaultSections: [
            { id: 1, title: 'Delivery Information', content: 'Fast and free delivery across the UK!', enabled: true },
            { id: 2, title: 'Return Policy', content: '30-day hassle-free returns', enabled: true },
            { id: 3, title: 'Product Features', content: 'High-quality product with excellent features', enabled: true },
            { id: 4, title: 'Customer Service', content: '24/7 customer support available', enabled: true },
            { id: 5, title: 'Warranty', content: 'Full manufacturer warranty included', enabled: true },
            { id: 6, title: 'Compatibility', content: 'Compatible with all major devices', enabled: true },
            { id: 7, title: 'Additional Info', content: 'Contact us for bulk orders', enabled: true }
        ],
        listingText: 'Thank you for choosing our store! We deliver fast and provide excellent customer service.'
    }
}