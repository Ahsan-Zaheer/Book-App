const createUrl = ( path ) =>{
    return window.location.origin + path;
}


export const askQuestion = async (question) => {
    const res = await fetch( new Request( createUrl('/api/book'), {
        method: 'POST',
        body: JSON.stringify({question}),
    }));
    if(res.ok) {
        const data = await res.json();
        return data.data;
    } else {
        throw new Error('Failed to resolve the question');
    }    

}

export const createBook = async (summary, authorId) => {
    const res = await fetch(new Request(createUrl('/api/book/summary'), {
        method: 'POST',
        body: JSON.stringify({ summary, authorId }),
    }));
    if(res.ok) {
        const data = await res.json();
        return data.data;
    } else {
        throw new Error('Failed to create book');
    }
}


export const saveTitle = async (bookId, title) => {
    const res = await fetch(new Request(createUrl('/api/book/title'), {
        method: 'POST',
        body: JSON.stringify({ bookId, title }),
    }));
    if(res.ok) {
        const data = await res.json();
        return data.data;
    } else {
        throw new Error('Failed to save title');
    }
}

export const generateBook = async ({ bookId, bookType, summary, title, chapterCount, keyPoints }) => {
    const res = await fetch(new Request(createUrl('/api/book/generate'), {
        method: 'POST',
        body: JSON.stringify({ bookId, bookType, summary, title, chapterCount, keyPoints }),
    }));
    if(res.ok) {
        const data = await res.json();
        return data.data;
    } else {
        throw new Error('Failed to generate book');
    }
}
export const generateChapterStream = async ({ bookId, bookType, summary, title, chapterIndex, chapterTitle, keyPoints, targetWordCount, partIndex, previousParts }) => {
    const res = await fetch(new Request(createUrl('/api/book/chapter'), {
        method: 'POST',
        body: JSON.stringify({ bookId, bookType, summary, title, chapterIndex, chapterTitle, keyPoints, targetWordCount, partIndex, previousParts }),
    }));
    if(!res.ok || !res.body) {
        throw new Error('Failed to generate chapter');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    async function* parse() {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 2);
                if (line.startsWith('data: ')) {
                    yield line.slice(6);
                }
            }
        }
    }

    return parse();
};

export const loadChatState = async (bookId) => {
    const cached = localStorage.getItem(`chat_${bookId}`);
    if (cached) {
        try {
            const parsedCache = JSON.parse(cached);
            console.log("📚 API: Using cached data for book:", bookId);
            console.log("📚 API: Cached data has chapters:", parsedCache?.chapters?.length || 0);
            return parsedCache;
        } catch (e) {
            console.warn("📚 API: Failed to parse cached data, fetching fresh");
        }
    }
    
    console.log("📚 API: Fetching fresh data for book:", bookId);
    const res = await fetch(createUrl(`/api/book/chat?bookId=${bookId}`));
    if (res.ok) {
        const response = await res.json();
        console.log("📚 API: Raw response:", response);
        console.log("📚 API: Response has data:", !!response.data);
        console.log("📚 API: Data has chapters:", response.data?.chapters?.length || 0);
        
        if (response.data) {
            // Cache the book data
            localStorage.setItem(`chat_${bookId}`, JSON.stringify(response.data));
            return response.data;
        }
        return null;
    } else {
        throw new Error('Failed to load chat');
    }
};

export const saveChatState = async (bookId, state) => {
    localStorage.setItem(`chat_${bookId}`, JSON.stringify(state));
    const res = await fetch(new Request(createUrl('/api/book/chat'), {
        method: 'PUT',
        body: JSON.stringify({ bookId, state }),
    }));
    if (res.ok) {
        const data = await res.json();
        return data.data;
    } else {
        throw new Error('Failed to save chat');
    }
};

export const createUser = async (name, email) => {
    const res = await fetch(new Request(createUrl('/api/user'), {
        method: 'POST',
        body: JSON.stringify({ name, email }),
    }));
    if(res.ok){
        const data = await res.json();
        return data.data;
    } else {
        throw new Error('Failed to create user');
    }
};

export const fetchSheets = async () => {
    const res = await fetch(createUrl('/api/sheets'));
    if(res.ok){
        const data = await res.json();
        return data.data;
    } else {
        throw new Error('Failed to load sheets');
    }
};
