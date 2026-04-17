import ImageKit from "imagekit";

const imagekit = new ImageKit({
  urlEndpoint: 'https://ik.imagekit.io/vzp8taxcnc/',
  publicKey: 'public_kFHkU6GMQrtHeX9lEvE8hn7bOqM=',
  privateKey: 'private_gmop3xPeKcvyE3CN0R+2L3cWh1M='
});

const handleimagKitauth=(req,res)=>{
    try {
    const authParams = imagekit.getAuthenticationParameters();
    return res.json(authParams);
    } catch (error) {
        throw new Error(error);
    }
}

export {handleimagKitauth}