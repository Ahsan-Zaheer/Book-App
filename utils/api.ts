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
