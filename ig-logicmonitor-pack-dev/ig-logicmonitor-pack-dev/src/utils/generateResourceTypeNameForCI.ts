const generateResourceTypeNameForCI = (resourceType?: number) => {
    switch (resourceType) {
        case 0: {
            return 'Regular::Device';
        }
        case 1: {
            return 'APPGROUP::Device';
        }
        case 2: {
            return 'AWS::Device';
        }
        case 3: {
            return 'Service::Device';
        }
        case 4: {
            return 'Azure::Device';
        }
        case 6: {
            return 'Biz::Service::Device';
        }
        case 7: {
            return 'GCP::Device';
        }
        case 8: {
            return 'K8S::Device';
        }
        default: {
            return 'logicmonitorGenericCi';
        }
    }
}

export default generateResourceTypeNameForCI;

// integer($int32)
// example: 0
// The type of device: 0 indicates a regular device, 1 indicates an APPGROUP device, 2 indicates an AWS device, 3 indicates a service device, 4 indicates an Azure device, 6 indicates a biz_service device, 7 indicates a GCP device, 8 indicates K8S device