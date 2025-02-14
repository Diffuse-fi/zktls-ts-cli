import { DiffuseClient } from '../src'
import { config } from 'dotenv'
config()

export const getEthPrice = async () => {
    // Get your APP_ID and APP_SECRET from the Diffuse Devtool (https://dev.diffuse.fi/)
    const diffuse = new DiffuseClient(process.env.APP_ID!, process.env.APP_SECRET!, true)
    const options = {
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
        },
    }
    const privateOptions = {
        responseMatches: [{
            type: 'regex' as const,
            value: 'ethereum":{"usd":(?<price>.*?)}}',
        }],
        responseRedactions: [{
            regex: 'ethereum":{"usd":(?<price>.*?)}}',
        }]

    }
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
    return await diffuse.fetchProof(url, options, privateOptions)
}