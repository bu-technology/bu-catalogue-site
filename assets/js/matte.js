/* ---------------------------------------------------------------
   Client-side background matting.

   Product photography shot on a seamless white/near-white backdrop
   can be turned into a transparent PNG entirely in the browser: draw
   it to a canvas, sample the corners as the background colour, then
   fade pixels close to that colour to transparent with a soft edge
   so it doesn't look cut out with scissors.
   --------------------------------------------------------------- */

function _buSampleCorners(data, w, h){
  const px = (x,y)=>{
    const i = (y*w + x) * 4;
    return [data[i], data[i+1], data[i+2]];
  };
  const pts = [px(0,0), px(w-1,0), px(0,h-1), px(w-1,h-1)];
  const avg = [0,0,0];
  pts.forEach(p=>{ avg[0]+=p[0]; avg[1]+=p[1]; avg[2]+=p[2]; });
  return [avg[0]/4, avg[1]/4, avg[2]/4];
}

/**
 * @param source  an Image, ImageBitmap, or canvas already holding the photo
 * @param opts    { threshold: 0..441 (colour-distance cutoff), feather: px of soft edge }
 * @returns Promise<Blob>  a PNG blob with the background matted to transparent
 */
function buMatteBackground(source, opts){
  opts = opts || {};
  const threshold = opts.threshold !== undefined ? opts.threshold : 34;
  const feather = opts.feather !== undefined ? opts.feather : 26;

  const w = source.naturalWidth || source.width;
  const h = source.naturalHeight || source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const bg = _buSampleCorners(data, w, h);

  for(let i=0; i<data.length; i+=4){
    const dr = data[i]-bg[0], dg = data[i+1]-bg[1], db = data[i+2]-bg[2];
    const dist = Math.sqrt(dr*dr + dg*dg + db*db);
    if(dist <= threshold){
      data[i+3] = 0;
    } else if(dist <= threshold + feather){
      data[i+3] = Math.round(255 * (dist - threshold) / feather);
    }
    // else: fully opaque, leave alpha as-is
  }
  ctx.putImageData(imgData, 0, 0);

  return new Promise(resolve=>{
    canvas.toBlob(blob=> resolve(blob), 'image/png');
  });
}

/**
 * Matte a File (from a file input) before upload.
 * Falls back to the original file untouched if anything goes wrong,
 * so a bad photo never blocks the add-drink flow.
 */
function buMatteFile(file){
  return new Promise((resolve)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async ()=>{
      try{
        const blob = await buMatteBackground(img);
        URL.revokeObjectURL(url);
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type:'image/png' }));
      } catch(e){
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Matte an already-hosted image (e.g. a Supabase Storage URL) by
 * fetching it as a blob first — this avoids canvas tainting, since a
 * same-origin blob: URL is never considered cross-origin regardless
 * of where the bytes originally came from.
 */
async function buMatteRemoteUrl(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('Could not fetch the image (' + res.status + ')');
  const srcBlob = await res.blob();
  const objUrl = URL.createObjectURL(srcBlob);
  try{
    const img = await new Promise((resolve,reject)=>{
      const im = new Image();
      im.onload = ()=> resolve(im);
      im.onerror = reject;
      im.src = objUrl;
    });
    return await buMatteBackground(img);
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}
