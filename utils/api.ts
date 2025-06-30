const createUrl = (path) =>{
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

export const createBook = async (summary) => {
    const res = await fetch(new Request(createUrl('/api/book/summary'), {
        method: 'POST',
        body: JSON.stringify({ summary }),
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