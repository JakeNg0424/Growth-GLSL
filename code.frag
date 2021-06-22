// Random number generator, don't change
#define BAD_W 0x464fffffU
#define BAD_Z 0x9068ffffU

void rng_set_seed(uint seed1, uint seed2, inout uint m_w, inout uint m_z)
{
    m_w = seed1;
    m_z = seed2;
    if (m_w == 0U || m_w == BAD_W)
        ++m_w;
    if (m_w == 0U || m_z == BAD_Z)
        ++m_z;
}

uint rng_hash(uint seed)
{
    seed = (seed ^ 61U) ^ (seed >> 16U);
    seed *= 9U;
    seed = seed ^ (seed >> 4U);
    seed *= 0x27d4eb2dU;
    seed = seed ^ (seed >> 15U);
    return seed;
}

uint rng_random_uint(inout uint m_w, inout uint m_z)
{
    m_z = 36969U * (m_z & 65535U) + (m_z >> 16U);
    m_w = 18000U * (m_w & 65535U) + (m_w >> 16U);
    return uint((m_z << 16U) + m_w);
}

float rng_random_float(inout uint m_w, inout uint m_z)
{
    return float(rng_random_uint(m_w, m_z)) / float(0xFFFFFFFFU);
}

vec2 angleToDir(const float angle)
{
    return vec2(cos(angle), sin(angle));
}

// Functional defines
#define PARTICLES sTD2DInputs[0]
#define PARTICLES_PROPS uTD2DInfos[0]
#define SEDIMENT sTD2DInputs[1]
#define SEDIMENT_PROPS uTD2DInfos[1]
#define EPSILON 0.001

// Simulation parameters
uniform float timeStep;
uniform float dirPerturbation;
uniform vec2 domainSize;

out vec4 fragColor0;
void main()
{
    // Read current particle state
    vec4 particle_data = texture(PARTICLES, vUV.st, 0);
    vec2 particle_pos = particle_data.xy;
    float particle_angle = particle_data.z;
    bool particle_stuck = bool(particle_data.w);

    // Initialize random number generator unique to each particle
    uint rng_w1 = 0U;
    uint rng_w2 = 0U;
    rng_set_seed(rng_hash(uint(uTDPass * (PARTICLES_PROPS.res.z * vUV.s + PARTICLES_PROPS.res.z * PARTICLES_PROPS.res.w * vUV.t))), rng_hash(uint(113.0 * (particle_pos.x + domainSize.x * particle_pos.y))), rng_w1, rng_w2);

    if (!particle_stuck)
    {
        // Diffuse particle position and direction
        particle_angle += (rng_random_float(rng_w1, rng_w2) - 0.5) * dirPerturbation;
        vec2 particle_dir = angleToDir(particle_angle);
        vec2 particle_pos_new = particle_pos + timeStep * particle_dir;

        // Check for sedimentation at the new position
        vec4 sediment_data = texture(SEDIMENT, particle_pos_new / domainSize, 0);
        if (sediment_data.g > EPSILON)
            particle_stuck = true;
        else
            particle_pos = mod(particle_pos_new, domainSize);
    }

    // Update the simulation state
    particle_data = vec4(particle_pos, particle_angle, float(particle_stuck));
    fragColor0 = TDOutputSwizzle(particle_data);
}