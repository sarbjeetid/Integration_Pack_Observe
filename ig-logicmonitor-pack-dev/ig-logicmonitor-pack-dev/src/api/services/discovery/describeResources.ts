import { Container } from "typedi";
import winston from "winston";
import { LogicMonitorDiscoveryRequestFullI } from "../../../interfaces/discovery";
import generateResourceTypeNameForCI from "../../../utils/generateResourceTypeNameForCI";
import { publishToDIS } from '../../../utils/publishToDIS';
import config from '../../../config';
import { DaprClient } from 'dapr-client';
import sleep from '../../../utils/sleep';
import path from "path";
import logicmonitorLabels from "../../../utils/logicmonitorLabel";

const describeResourcesService = async (
    body: LogicMonitorDiscoveryRequestFullI, contextId: string, device: any) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const pubSubName = config.discoveryPubSubName;

    if (!device) {
        loggerInstance.warn(`No data in device`, { path: path.relative(process.cwd(), __filename) });
        return;
    }
    try {
        const allowedAssignmentGroups = config.allowedAssignmentGroups?.split(',') || [];

        // Check if 'assignmentgroup' is present in inheritedProperties
        let assignmentGroup =
            device.customProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.assignmentgroup")
            )?.value ||
            device.inheritedProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.assignmentgroup")
            )?.value;

        if (!assignmentGroup || !allowedAssignmentGroups.includes(assignmentGroup)) {
            loggerInstance.info(`Device skipped due to unmatched assignment group: ${assignmentGroup}`, {
                path: path.relative(process.cwd(), __filename),
                deviceId: device.id
            });
            return;
        }

        // Extract system.groups value from the device's systemProperties
        let systemGroups = device.systemProperties.find(
            (prop: { name: string; }) => prop.name === "system.groups"
        ).value;

        // Get location and deviceType
        let { location, deviceByType } = extractLocationAndDeviceType(systemGroups);

        // Check if 'externalResourceType' is present in autoProperties
        let externalResourceType =
            device.autoProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("predef.externalresourcetype")
            )?.value || "";

        // Check if 'snLocation' is present in inheritedProperties
        let snLocation =
            device.customProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.location")
            )?.value ||
            device.inheritedProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.location")
            )?.value;

        // Check if 'category' is present in inheritedProperties
        let category =
            device.customProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.category")
            )?.value ||
            device.inheritedProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.category")
            )?.value;

        // Check if 'subcategory' is present in inheritedProperties
        let subcategory =
            device.customProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.subcategory")
            )?.value ||
            device.inheritedProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.subcategory")
            )?.value;

        const ignoreCIList = config.ignoreCiList?.split(',') || [];
        // Check if 'ci' is present in customProperties or inheritedProperties
        let snCI =
            device.customProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.ci")
            )?.value ||
            device.inheritedProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.ci")
            )?.value ||
            device.inheritedProperties?.find(
                (prop: { name: string }) => prop.name.toLowerCase().includes("sn.configurationitem")
            )?.value;

        let ci = ignoreCIList.includes(snCI) ? "" : snCI;

        // Check if 'devicePriority' is present in systemProperties
        let devicePriority = device.customProperties?.find(
            (prop: { name: string }) => prop.name.toLowerCase().includes("device.priority")
        )?.value;

        // Convert into Intelligeni format: Node - CI
        let deviceTypeName = generateResourceTypeNameForCI(device.deviceType);

        let finalCitype = externalResourceType?.trim() &&
            externalResourceType.trim().toLowerCase() !== 'unknown'
            ? `${externalResourceType.trim()}`
            : `${deviceByType}::${deviceTypeName}`;

        let node = {
            source_name: device.displayName || device.name || device.id.toString(),
            id: device.id.toString(),
            zone_id: body.zone_id,
            stack_id: body.stack_id,
            properties: JSON.stringify({ source_properties: device }),
            type: "ci",
            source_type: finalCitype,
            label: "CI",
            citype: finalCitype,
            location: snLocation || location || 'NA',
            ...(ci ? { ci_merge_key: ci } : {}),
            itsm: {
                "assignment_group": assignmentGroup || "",
                "location": snLocation || "",
                "category": category || "",
                "sub_category": subcategory || "",
                "priority": devicePriority || "",
                "caller_id": 'REST_IntelligeniNetOpsObserve_Standard',
                "center_id": ci,
            }
        }

        let labelDocuments = logicmonitorLabels.filter((labelDocument) => {
            return labelDocument.source_type == deviceTypeName
        });

        if (labelDocuments.length) {
            let labelDocument = labelDocuments[0];
            node = {
                ...node,
                ...labelDocument
            }
        }

        // send node document to DIS APIs
        await publishToDIS(node, 'ci');

        // Trigger interface discovery
        if (config.enableInterfaceDiscovery === 'true') {
            await triggerInterfaceDiscovery(pubSubName, body, contextId, node.id);
        }

        // trigger metric discovery
        if (config.enableMetricDiscovery === 'true') {
            await triggerMetricDiscovery(pubSubName, body, contextId, node.id, node.source_type);
        }
    } catch (error) {
        loggerInstance.error(`[src::api::services::discovery::describeResources.ts::describeResourcesService] Error in fetching device details for LM in describe Service: ${JSON.stringify(error)}`, { path: path.relative(process.cwd(), __filename) })
    }
}

const triggerInterfaceDiscovery = async (
    pubSubName: string,
    body: LogicMonitorDiscoveryRequestFullI,
    contextId: string,
    deviceId: string,
) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const daprClient: DaprClient = Container.get('daprClient');

    try {
        const topic = config.interfaceDiscoveryTopicName;
        const message = {
            body,
            contextId,
            deviceId,
        };

        await sleep(config.waitTimeinMs);
        await daprClient.pubsub.publish(pubSubName, topic, message);

        loggerInstance.info(
            `Published interface discovery message for device ${deviceId}`
        );
    } catch (err) {
        loggerInstance.error(`Error in publishing to InterfaceDiscovery topic ${err}`, { path: path.relative(process.cwd(), __filename) });
        return {
            error: 'Error in publishing to InterfaceDiscovery topic',
            data: err
        };
    }
};

const triggerMetricDiscovery = async (
    pubSubName: string,
    body: LogicMonitorDiscoveryRequestFullI,
    contextId: string,
    deviceId: string,
    deviceType: string
) => {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    const daprClient: DaprClient = Container.get('daprClient');

    try {
        const topic = config.metricDiscoveryTopicName;
        const message = {
            body,
            contextId,
            deviceId: deviceId,
            deviceType: deviceType,
        }
        await sleep(config.waitTimeinMs);
        await daprClient.pubsub.publish(
            pubSubName,
            topic,
            message
        );
    } catch (err) {
        loggerInstance.error(`Error in publishing to metricDiscovery topic ${err}`, { path: path.relative(process.cwd(), __filename) });
        return {
            error: 'Error in publishing to metricDiscovery topic',
            data: err
        };
    }
};

// Function to extract location and deviceType from system.groups
function extractLocationAndDeviceType(systemGroups: string) {
    const loggerInstance: winston.Logger = Container.get('loggerInstance');
    try {
        let location = '';
        let deviceByType = '';

        // Split the system.groups string into an array
        let groups = systemGroups?.split(',') || [];

        // Iterate through each group to find the location and deviceType
        groups.forEach(group => {
            const groupParts = group.split('/');
            const lastPart = groupParts.pop()?.trim() || '';

            if (group.includes("Zone")) {
                location = lastPart;  // Extracts Zone X or set as an empty string if undefined
            }
            if (group.includes("Devices by Type")) {
                deviceByType = lastPart;  // Extracts the device type or set as an empty string if undefined
            }
        });

        return { location, deviceByType };
    } catch (error) {
        loggerInstance.error(`[src::api::services::discovery::describeResources.ts::extractLocationAndDeviceType] Error in extractLocationAndDeviceType: ${error}`);
        return { location: '', deviceByType: '' }; // Return default values in case of an error
    }
}

export { describeResourcesService };

