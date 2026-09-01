/* ---------------------------------------------------------------
   ShaderGradient backgrounds.

   GLSL and preset values are from ShaderGradient by ruucm &
   stone-skipper (MIT licensed) — https://github.com/ruucm/shadergradient
   Ported here from React Three Fiber to plain three.js.

   The gradient is a 3D mesh (plane / sphere / waterPlane) whose
   vertices are displaced by Perlin noise, shaded with a physical
   material and lit — not a flat 2D gradient.
   --------------------------------------------------------------- */

const _SG_NOISE_plane = `// noise source from https://github.com/hughsk/glsl-noise/blob/master/periodic/3d.glsl

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float cnoise(vec3 P)
{
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}`;

const _SG_BODY_plane = `

  float t = uTime * uSpeed;
  
  // For seamless loops, sample noise using 4D-like circular interpolation
  vec3 noisePos = 0.43 * position * uNoiseDensity;
  float distortion;
  
  if (uLoop > 0.5) {
    // Create truly dynamic seamless loop using 4D noise simulation
    // Loop progress only depends on time and duration, not speed
    float loopProgress = uTime / uLoopDuration;
    float angle = loopProgress * 6.28318530718; // 2*PI
    
    // Radius scales with speed to maintain consistent visual speed
    // Larger radius = more distance traveled = faster perceived motion
    float radius = 5.0 * uSpeed;
    
    // Sample 4 noise values at cardinal points around the circle
    vec3 offset0 = vec3(cos(angle) * radius, sin(angle) * radius, 0.0);
    vec3 offset1 = vec3(cos(angle + 1.57079632679) * radius, sin(angle + 1.57079632679) * radius, 0.0);
    vec3 offset2 = vec3(cos(angle + 3.14159265359) * radius, sin(angle + 3.14159265359) * radius, 0.0);
    vec3 offset3 = vec3(cos(angle + 4.71238898038) * radius, sin(angle + 4.71238898038) * radius, 0.0);
    
    // Get noise at all 4 points
    float n0 = cnoise(noisePos + offset0);
    float n1 = cnoise(noisePos + offset1);
    float n2 = cnoise(noisePos + offset2);
    float n3 = cnoise(noisePos + offset3);
    
    // Smooth interpolation weights using cosine
    float w0 = (cos(angle) + 1.0) * 0.5;
    float w1 = (cos(angle + 1.57079632679) + 1.0) * 0.5;
    float w2 = (cos(angle + 3.14159265359) + 1.0) * 0.5;
    float w3 = (cos(angle + 4.71238898038) + 1.0) * 0.5;
    
    // Normalize weights
    float totalWeight = w0 + w1 + w2 + w3;
    w0 /= totalWeight;
    w1 /= totalWeight;
    w2 /= totalWeight;
    w3 /= totalWeight;
    
    // Blend all samples with amplitude boost to match single-sample strength
    // Blending reduces amplitude by ~30%, so we compensate
    float blendedNoise = n0 * w0 + n1 * w1 + n2 * w2 + n3 * w3;
    distortion = 0.75 * blendedNoise * 1.5;
  } else {
    // Normal linear time progression
    distortion = 0.75 * cnoise(noisePos + t);
  }

  vec3 pos = position + normal * distortion * uNoiseStrength * uLoadingTime;
  vPos = pos;`;

const _SG_DIFFUSE_plane = `vec4 diffuseColor = vec4(
      mix(mix(color1, color2, smoothstep(-3.0, 3.0, vPos.x)), color3, vPos.z),
      1);`;

const _SG_NOISE_sphere = `vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}`;

const _SG_BODY_sphere = `float t = uTime * uSpeed;
  
  // For seamless loops, sample noise using 4D-like circular interpolation
  float distortion;
  float angle;
  
  if (uLoop > 0.5) {
    // Create truly dynamic seamless loop using 4D noise simulation
    float loopProgress = uTime / uLoopDuration;
    float loopAngle = loopProgress * 6.28318530718; // 2*PI
    
    // Radius scales with speed to maintain consistent visual speed
    float radius = 5.0 * uSpeed;
    
    // Sample 4 noise values at cardinal points
    vec3 offset0 = vec3(cos(loopAngle) * radius, sin(loopAngle) * radius, 0.0);
    vec3 offset1 = vec3(cos(loopAngle + 1.57079632679) * radius, sin(loopAngle + 1.57079632679) * radius, 0.0);
    vec3 offset2 = vec3(cos(loopAngle + 3.14159265359) * radius, sin(loopAngle + 3.14159265359) * radius, 0.0);
    vec3 offset3 = vec3(cos(loopAngle + 4.71238898038) * radius, sin(loopAngle + 4.71238898038) * radius, 0.0);
    
    // Get noise at all 4 points
    float n0 = pnoise((normal + offset0) * uNoiseDensity, vec3(10.0));
    float n1 = pnoise((normal + offset1) * uNoiseDensity, vec3(10.0));
    float n2 = pnoise((normal + offset2) * uNoiseDensity, vec3(10.0));
    float n3 = pnoise((normal + offset3) * uNoiseDensity, vec3(10.0));
    
    // Smooth interpolation weights
    float w0 = (cos(loopAngle) + 1.0) * 0.5;
    float w1 = (cos(loopAngle + 1.57079632679) + 1.0) * 0.5;
    float w2 = (cos(loopAngle + 3.14159265359) + 1.0) * 0.5;
    float w3 = (cos(loopAngle + 4.71238898038) + 1.0) * 0.5;
    
    float totalWeight = w0 + w1 + w2 + w3;
    w0 /= totalWeight;
    w1 /= totalWeight;
    w2 /= totalWeight;
    w3 /= totalWeight;
    
    // Blend samples with amplitude boost to match single-sample strength
    float blendedNoise = n0 * w0 + n1 * w1 + n2 * w2 + n3 * w3;
    distortion = blendedNoise * 1.5 * uNoiseStrength;
    
    // Apply loop to spiral effect with blended offset
    float angleOffset = offset0.x * w0 + offset1.x * w1 + offset2.x * w2 + offset3.x * w3;
    angle = sin(uv.y * uFrequency + angleOffset) * uAmplitude;
  } else {
    // Normal linear time progression
    distortion = pnoise((normal + t) * uNoiseDensity, vec3(10.0)) * uNoiseStrength;
    angle = sin(uv.y * uFrequency + t) * uAmplitude;
  }
  
  vec3 pos = position + (normal * distortion);
  pos = rotateY(pos, angle);

  vPos = pos;
  vDistort = distortion;
  `;

const _SG_DIFFUSE_sphere = `vec4 diffuseColor =
      vec4(mix(color3, mix(color2, color1, smoothstep(-1.0, 1.0, vPos.y)),
               distanceToCenter),
           1);`;

const _SG_NOISE_waterPlane = `vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float cnoise(vec3 P)
{
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}`;

const _SG_BODY_waterPlane = `float t = uTime * uSpeed;
  
  // For seamless loops, sample noise using 4D-like circular interpolation
  vec3 noisePos = 0.43 * position * uNoiseDensity;
  float distortion;
  
  if (uLoop > 0.5) {
    // Create truly dynamic seamless loop using 4D noise simulation
    float loopProgress = uTime / uLoopDuration;
    float angle = loopProgress * 6.28318530718; // 2*PI
    
    // Radius scales with speed to maintain consistent visual speed
    float radius = 5.0 * uSpeed;
    
    // Sample 4 noise values at cardinal points
    vec3 offset0 = vec3(cos(angle) * radius, sin(angle) * radius, 0.0);
    vec3 offset1 = vec3(cos(angle + 1.57079632679) * radius, sin(angle + 1.57079632679) * radius, 0.0);
    vec3 offset2 = vec3(cos(angle + 3.14159265359) * radius, sin(angle + 3.14159265359) * radius, 0.0);
    vec3 offset3 = vec3(cos(angle + 4.71238898038) * radius, sin(angle + 4.71238898038) * radius, 0.0);
    
    // Get noise at all 4 points
    float n0 = cnoise(noisePos + offset0);
    float n1 = cnoise(noisePos + offset1);
    float n2 = cnoise(noisePos + offset2);
    float n3 = cnoise(noisePos + offset3);
    
    // Smooth interpolation weights
    float w0 = (cos(angle) + 1.0) * 0.5;
    float w1 = (cos(angle + 1.57079632679) + 1.0) * 0.5;
    float w2 = (cos(angle + 3.14159265359) + 1.0) * 0.5;
    float w3 = (cos(angle + 4.71238898038) + 1.0) * 0.5;
    
    float totalWeight = w0 + w1 + w2 + w3;
    w0 /= totalWeight;
    w1 /= totalWeight;
    w2 /= totalWeight;
    w3 /= totalWeight;
    
    // Blend samples with amplitude boost to match single-sample strength
    float blendedNoise = n0 * w0 + n1 * w1 + n2 * w2 + n3 * w3;
    distortion = 0.75 * blendedNoise * 1.5;
  } else {
    // Normal linear time progression
    distortion = 0.75 * cnoise(noisePos + t);
  }

  vec3 pos = position + normal * distortion * uNoiseStrength;
  vPos = pos;`;

const _SG_DIFFUSE_waterPlane = `vec4 diffuseColor = vec4(
      mix(mix(color1, color2, smoothstep(-3.0, 3.0, vPos.x)), color3, vPos.z),
      1);`;

/* ---- the 10 official presets, values taken from the ShaderGradient repo ---- */
const BU_SHADER_PRESETS = {
  halo:        { title:'Halo',         type:'plane',      uAmplitude:1,   uDensity:1.3, uSpeed:0.4, uStrength:4,   uFrequency:5.5, brightness:1.2, cAzimuthAngle:180, cDistance:3.6, cPolarAngle:90,  cameraZoom:1,    color1:'#ff5005', color2:'#dbba95', color3:'#d0bce1', grain:'on',  positionX:-1.4, positionY:0,     positionZ:0,    reflection:0.1, rotationX:0,  rotationY:10,  rotationZ:50 },
  pensive:     { title:'Pensive',      type:'sphere',     uAmplitude:7,   uDensity:0.8, uSpeed:0.3, uStrength:0.4, uFrequency:5.5, brightness:1.5, cAzimuthAngle:250, cDistance:1.5, cPolarAngle:140, cameraZoom:12.5, color1:'#809bd6', color2:'#910aff', color3:'#af38ff', grain:'on',  positionX:0,    positionY:0,     positionZ:0,    reflection:0.5, rotationX:0,  rotationY:0,   rotationZ:140 },
  mint:        { title:'Mint',         type:'waterPlane', uAmplitude:0,   uDensity:1.2, uSpeed:0.2, uStrength:3.4, uFrequency:0,   brightness:1.2, cAzimuthAngle:170, cDistance:4.4, cPolarAngle:70,  cameraZoom:1,    color1:'#94ffd1', color2:'#6bf5ff', color3:'#ffffff', grain:'off', positionX:0,    positionY:0.9,   positionZ:-0.3, reflection:0.1, rotationX:45, rotationY:0,   rotationZ:0 },
  interstella: { title:'Interstella',  type:'sphere',     uAmplitude:3.2, uDensity:0.8, uSpeed:0.3, uStrength:0.3, uFrequency:5.5, brightness:0.8, cAzimuthAngle:270, cDistance:0.5, cPolarAngle:180, cameraZoom:15.1, color1:'#73bfc4', color2:'#ff810a', color3:'#8da0ce', grain:'on',  positionX:-0.1, positionY:0,     positionZ:0,    reflection:0.4, rotationX:0,  rotationY:130, rotationZ:70 },
  nightyNight: { title:'Nighty Night', type:'waterPlane', uAmplitude:0,   uDensity:1.5, uSpeed:0.3, uStrength:1.5, uFrequency:0,   brightness:1,   cAzimuthAngle:180, cDistance:2.8, cPolarAngle:80,  cameraZoom:9.1,  color1:'#606080', color2:'#8d7dca', color3:'#212121', grain:'on',  positionX:0,    positionY:0,     positionZ:0,    reflection:0.1, rotationX:50, rotationY:0,   rotationZ:-60 },
  viola:       { title:'Viola',        type:'sphere',     uAmplitude:1.4, uDensity:1.1, uSpeed:0.1, uStrength:1,   uFrequency:5.5, brightness:1.1, cAzimuthAngle:0,   cDistance:7.1, cPolarAngle:140, cameraZoom:17.3, color1:'#ffffff', color2:'#ffbb00', color3:'#0700ff', grain:'off', positionX:0,    positionY:0,     positionZ:0,    reflection:0.1, rotationX:0,  rotationY:0,   rotationZ:0 },
  universe:    { title:'Universe',     type:'waterPlane', uAmplitude:0,   uDensity:1.1, uSpeed:0.1, uStrength:2.4, uFrequency:5.5, brightness:1.1, cAzimuthAngle:180, cDistance:3.9, cPolarAngle:115, cameraZoom:1,    color1:'#5606ff', color2:'#fe8989', color3:'#000000', grain:'off', positionX:-0.5, positionY:0.1,   positionZ:0,    reflection:0.1, rotationX:0,  rotationY:0,   rotationZ:235 },
  sunset:      { title:'Sunset',       type:'sphere',     uAmplitude:1.4, uDensity:1.1, uSpeed:0.1, uStrength:0.4, uFrequency:5.5, brightness:1.5, cAzimuthAngle:60,  cDistance:7.1, cPolarAngle:90,  cameraZoom:15.3, color1:'#ff7a33', color2:'#33a0ff', color3:'#ffc53d', grain:'off', positionX:0,    positionY:-0.15, positionZ:0,    reflection:0.1, rotationX:0,  rotationY:0,   rotationZ:0 },
  mandarin:    { title:'Mandarin',     type:'waterPlane', uAmplitude:0,   uDensity:1.8, uSpeed:0.2, uStrength:3,   uFrequency:5.5, brightness:1.2, cAzimuthAngle:180, cDistance:2.4, cPolarAngle:95,  cameraZoom:1,    color1:'#ff6a1a', color2:'#c73c00', color3:'#FD4912', grain:'off', positionX:0,    positionY:-2.1,  positionZ:0,    reflection:0.1, rotationX:0,  rotationY:0,   rotationZ:225 },
  cottonCandy: { title:'Cotton Candy', type:'waterPlane', uAmplitude:0,   uDensity:1,   uSpeed:0.3, uStrength:3,   uFrequency:5.5, brightness:1.2, cAzimuthAngle:180, cDistance:2.9, cPolarAngle:120, cameraZoom:1,    color1:'#ebedff', color2:'#f3f2f8', color3:'#dbf8ff', grain:'off', positionX:0,    positionY:1.8,   positionZ:0,    reflection:0.1, rotationX:0,  rotationY:0,   rotationZ:-90 }
};

const _SG_PARTS = {
  plane:      { noise:_SG_NOISE_plane,      body:_SG_BODY_plane,      diffuse:_SG_DIFFUSE_plane },
  sphere:     { noise:_SG_NOISE_sphere,     body:_SG_BODY_sphere,     diffuse:_SG_DIFFUSE_sphere },
  waterPlane: { noise:_SG_NOISE_waterPlane, body:_SG_BODY_waterPlane, diffuse:_SG_DIFFUSE_waterPlane }
};

function _sgHexToRgb(hex){
  hex = (hex||'#000000').trim();
  if(hex.length===4) hex = '#'+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  const n = parseInt(hex.slice(1),16);
  if(isNaN(n)) return {r:0,g:0,b:0};
  return { r:((n>>16)&255)/255, g:((n>>8)&255)/255, b:(n&255)/255 };
}

/**
 * Render an animated ShaderGradient into a canvas.
 * @param canvas   target <canvas>
 * @param presetKey key of BU_SHADER_PRESETS
 * @param colors   optional [c1,c2,c3] hex overrides
 * @param opts     { quality }
 */
function buStartBackground(canvas, presetKey, colors, opts){
  opts = opts || {};
  const preset = BU_SHADER_PRESETS[presetKey] || BU_SHADER_PRESETS.halo;
  const type = preset.type;
  const parts = _SG_PARTS[type];

  if(typeof THREE === 'undefined'){
    canvas.style.background = (colors && colors[0]) || preset.color1;
    return { stop(){}, resume(){}, setColors(){}, setPreset(){} };
  }

  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ canvas, antialias:false, alpha:true, powerPreference:'default' });
    renderer.setClearColor(0x000000, 0);
  } catch(e){
    canvas.style.background = (colors && colors[0]) || preset.color1;
    return { stop(){}, resume(){}, setColors(){}, setPreset(){} };
  }

  const quality = opts.quality || 1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * quality);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

  // ambientLight intensity = brightness * PI, as in the original Lights component
  const ambient = new THREE.AmbientLight(0xffffff, preset.brightness * Math.PI);
  scene.add(ambient);

  let c1 = _sgHexToRgb((colors && colors[0]) || preset.color1);
  let c2 = _sgHexToRgb((colors && colors[1]) || preset.color2);
  let c3 = _sgHexToRgb((colors && colors[2]) || preset.color3);

  const uniforms = {
    uTime:         { value: 0 },
    uSpeed:        { value: preset.uSpeed },
    uNoiseDensity: { value: preset.uDensity },
    uNoiseStrength:{ value: preset.uStrength },
    uFrequency:    { value: preset.uFrequency },
    uAmplitude:    { value: preset.uAmplitude },
    uLoadingTime:  { value: 1 },
    uLoop:         { value: 0 },
    uLoopDuration: { value: 6 },
    uC1r:{value:c1.r}, uC1g:{value:c1.g}, uC1b:{value:c1.b},
    uC2r:{value:c2.r}, uC2g:{value:c2.g}, uC2b:{value:c2.b},
    uC3r:{value:c3.r}, uC3g:{value:c3.g}, uC3b:{value:c3.b}
  };

  const material = new THREE.MeshPhysicalMaterial({
    roughness: 1 - (preset.reflection || 0.1),
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.5,
    side: THREE.DoubleSide
  });

  material.onBeforeCompile = (shader)=>{
    Object.keys(uniforms).forEach(k=> shader.uniforms[k] = uniforms[k]);

    // ---- vertex: inject noise + displacement, replacing <begin_vertex> ----
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `
        ${parts.noise}
        mat3 sgRotY(float a){ float s=sin(a), c=cos(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }
        vec3 rotateY(vec3 v, float a){ return sgRotY(a) * v; }
        varying vec3 vPos;
        varying float vDistort;
        uniform float uTime, uSpeed, uNoiseDensity, uNoiseStrength, uFrequency, uAmplitude;
        uniform float uLoadingTime, uLoop, uLoopDuration;
        void main() {
      `)
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        ${parts.body}
        transformed = pos;
      `);

    // ---- fragment: replace the base colour with the gradient ----
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `
        varying vec3 vPos;
        varying float vDistort;
        uniform float uC1r,uC1g,uC1b,uC2r,uC2g,uC2b,uC3r,uC3g,uC3b;
        void main() {
      `)
      .replace('#include <color_fragment>', `
        #include <color_fragment>
        {
          vec3 color1 = vec3(uC1r,uC1g,uC1b);
          vec3 color2 = vec3(uC2r,uC2g,uC2b);
          vec3 color3 = vec3(uC3r,uC3g,uC3b);
          float distanceToCenter = distance(vPos, vec3(0.0));
          ${parts.diffuse.replace('vec4 diffuseColor =', 'vec4 sgColor =')}
          diffuseColor = sgColor;
        }
      `);
  };

  let geometry;
  const MESH = 192;
  if(type === 'plane')       geometry = new THREE.PlaneGeometry(10, 10, 1, MESH);
  else if(type === 'sphere') geometry = new THREE.IcosahedronGeometry(1, Math.floor(MESH/3));
  else                       geometry = new THREE.PlaneGeometry(10, 10, MESH, MESH);

  const mesh = new THREE.Mesh(geometry, material);
  const D = Math.PI / 180;
  mesh.rotation.set(preset.rotationX * D, preset.rotationY * D, preset.rotationZ * D);
  mesh.position.set(preset.positionX, preset.positionY, preset.positionZ);
  scene.add(mesh);

  // camera placed from spherical angles, exactly like camera-controls does
  function placeCamera(){
    const az = preset.cAzimuthAngle * D;
    const po = preset.cPolarAngle * D;
    const dist = preset.cDistance;
    camera.position.set(
      dist * Math.sin(po) * Math.sin(az),
      dist * Math.cos(po),
      dist * Math.sin(po) * Math.cos(az)
    );
    camera.lookAt(0,0,0);
    camera.zoom = (type === 'sphere') ? preset.cameraZoom : 1;
    camera.updateProjectionMatrix();
  }

  function resize(){
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    placeCamera();
  }
  resize();
  const ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
  if(ro) ro.observe(canvas);

  const t0 = performance.now();
  let raf = null, running = true;
  function frame(){
    if(!running) return;
    uniforms.uTime.value = (performance.now() - t0) * 0.001;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    stop(){
      running = false;
      if(raf) cancelAnimationFrame(raf);
      if(ro) ro.disconnect();
      geometry.dispose(); material.dispose(); renderer.dispose();
    },
    resume(){ if(!running){ running = true; raf = requestAnimationFrame(frame); } },
    setColors(next){
      if(!next) return;
      const a = _sgHexToRgb(next[0] || preset.color1);
      const b = _sgHexToRgb(next[1] || preset.color2);
      const c = _sgHexToRgb(next[2] || preset.color3);
      uniforms.uC1r.value=a.r; uniforms.uC1g.value=a.g; uniforms.uC1b.value=a.b;
      uniforms.uC2r.value=b.r; uniforms.uC2g.value=b.g; uniforms.uC2b.value=b.b;
      uniforms.uC3r.value=c.r; uniforms.uC3g.value=c.g; uniforms.uC3b.value=c.b;
    }
  };
}
