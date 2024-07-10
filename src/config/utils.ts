import https from 'https';


export function checkInternetConnectivity(url: string = "https://secure.sysdig.com"): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (res) => {
            if (res.statusCode === 200) {
            resolve();
            } else {
            reject(new Error('Website is unreachable'));
            }
        }).on('error', (e) => {
            reject(new Error('No internet connection or the website is unreachable.'));
        });

        request.setTimeout(5000, () => {
            request.destroy();
            reject(new Error('Request timed out'));
        });
    });
}