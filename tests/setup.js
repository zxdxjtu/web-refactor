// Mock Chrome API for testing
global.chrome = {
    runtime: {
        getURL: jest.fn((path) => `chrome-extension://extension-id/${path}`),
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        },
        lastError: null
    },
    storage: {
        sync: {
            get: jest.fn((keys, callback) => {
                if (callback) callback({});
                return Promise.resolve({});
            }),
            set: jest.fn((items, callback) => {
                if (callback) callback();
                return Promise.resolve();
            })
        },
        local: {
            get: jest.fn((keys, callback) => {
                if (callback) callback({});
                return Promise.resolve({});
            }),
            set: jest.fn((items, callback) => {
                if (callback) callback();
                return Promise.resolve();
            }),
            remove: jest.fn((keys, callback) => {
                if (callback) callback();
                return Promise.resolve();
            })
        }
    },
    tabs: {
        query: jest.fn(() => Promise.resolve([])),
        get: jest.fn(() => Promise.resolve({})),
        sendMessage: jest.fn(() => Promise.resolve({})),
        captureVisibleTab: jest.fn(() => Promise.resolve('data:image/jpeg;base64,...')),
        onUpdated: {
            addListener: jest.fn()
        },
        onRemoved: {
            addListener: jest.fn()
        }
    },
    scripting: {
        executeScript: jest.fn(() => Promise.resolve())
    },
    i18n: {
        getMessage: jest.fn((key) => key),
        getUILanguage: jest.fn(() => 'en')
    }
};

// Mock fetch for i18n
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({
            popup: {
                title: 'Web Refactor',
                tabs: {
                    main: 'Main',
                    settings: 'Settings',
                    memories: 'Memories',
                    history: 'History'
                }
            }
        })
    })
);

// Mock DOM elements
document.body.innerHTML = `
    <div id="app">
        <div class="tab-content" id="main-tab"></div>
        <div class="tab-content" id="settings-tab"></div>
        <div class="tab-content" id="memories-tab"></div>
        <div class="tab-content" id="history-tab"></div>
    </div>
`;