const mapOrganizerProfile = (rawData) => {
    if (!rawData) return null;
    return {
        id: rawData.id,
        name: rawData.organizerInfo?.companyName || rawData.name,
        avatarUrl: rawData.profilePicUrl,
        website: rawData.organizerInfo?.website || '',
        organizerInfo: rawData.organizerInfo,
        followersCount: 0,
        rating: 5.0
    };
};

const buildOrganizerUpdateData = (updateData) => {
    const dataToUpdate = {};
    if (updateData.companyName) dataToUpdate['organizerInfo.companyName'] = updateData.companyName;
    if (updateData.taxCode) dataToUpdate['organizerInfo.taxCode'] = updateData.taxCode;
    if (updateData.description) dataToUpdate['organizerInfo.description'] = updateData.description;
    if (updateData.website) dataToUpdate['organizerInfo.website'] = updateData.website;
    if (updateData.avatarUrl) dataToUpdate['profilePicUrl'] = updateData.avatarUrl;
    if (updateData.name) dataToUpdate['name'] = updateData.name;
    return dataToUpdate;
};

module.exports = { mapOrganizerProfile, buildOrganizerUpdateData };
