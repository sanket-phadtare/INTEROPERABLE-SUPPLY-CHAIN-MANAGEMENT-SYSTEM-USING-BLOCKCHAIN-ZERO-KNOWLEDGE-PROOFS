// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PigLifecycle 
{
    struct PigData 
    {
        uint256 pig_id;
        bytes32 pig_hash;
        string ipfs_cid;
    }

    struct VaccinationData 
    {
        uint256 pig_id;
        bytes32 vaccine_hash;
        string ipfs_cid;
    }

    struct SalesData 
    {
        uint256 pig_id;
        bytes32 sales_hash;
        string ipfs_cid;
    }

    struct QRData 
    {
        uint256 pig_id;
        bytes32 qr_hash;
        string ipfs_cid;
    }

    mapping(uint256 => PigData) public pigData;
    mapping(uint256 => VaccinationData) public vaccinationData;
    mapping(uint256 => SalesData) public salesData;
    mapping(uint256 => QRData) public qrData;

    address public owner;

    event PigRegistered(uint256 pig_id, bytes32 pig_hash, string ipfs_cid);
    event VaccinationAdded(uint256 pig_id, bytes32 vaccine_hash, string ipfs_cid);
    event SaleRecorded(uint256 pig_id, bytes32 sales_hash, string ipfs_cid);
    event QRCodeGenerated(uint256 pig_id, bytes32 qr_hash, string ipfs_cid);

    constructor() 
    {
        owner = msg.sender;
    }

    modifier onlyOwner() 
    {
        require(msg.sender == owner, "Unauthorized: Only owner can call this function");
        _;
    }

    function registerPig(uint256[] memory pig_ids, bytes32[] memory pig_hashes, string[] memory ipfs_cids) public onlyOwner 
    {
        require(pig_ids.length == pig_hashes.length && pig_ids.length == ipfs_cids.length, "Input array lengths must match");

        for (uint256 i = 0; i < pig_ids.length; i++) 
        {
            require(pigData[pig_ids[i]].pig_id == 0, "Pig already registered");
            pigData[pig_ids[i]] = PigData(pig_ids[i], pig_hashes[i], ipfs_cids[i]);
            emit PigRegistered(pig_ids[i], pig_hashes[i], ipfs_cids[i]);
        }
    }

    function addVaccination(uint256[] memory pig_id, bytes32[] memory vaccine_hash, string[] memory ipfs_cid) public onlyOwner 
    {
       require(pig_id.length == vaccine_hash.length && pig_id.length == ipfs_cid.length, "Input array lengths must match");
       for(uint256 i=0; i< pig_id.length; i++)
       {
        require(vaccinationData[pig_id[i]].pig_id == 0, "Vaccine already recorded");
        vaccinationData[pig_id[i]] = VaccinationData(pig_id[i], vaccine_hash[i], ipfs_cid[i]);
        emit VaccinationAdded(pig_id[i], vaccine_hash[i], ipfs_cid[i]);
       }
    }

    function recordSale(uint256[] memory pig_id, bytes32[] memory sales_hash, string[] memory ipfs_cid) public onlyOwner 
    {
        require(pig_id.length == sales_hash.length && pig_id.length == ipfs_cid.length, "Input array lengths must match");

        for(uint256 i=0; i<pig_id.length; i++)
        {
            require(salesData[pig_id[i]].pig_id == 0, "Sales Data already recorded");
            salesData[pig_id[i]] = SalesData(pig_id[i], sales_hash[i], ipfs_cid[i]);
            emit SaleRecorded(pig_id[i], sales_hash[i], ipfs_cid[i]);
        }

    }

    function generateQRCode(uint256 pig_id, bytes32 qr_hash, string memory ipfs_cid) public onlyOwner 
    {
        require(qrData[pig_id].pig_id == 0, "QR code already generated");
        qrData[pig_id] = QRData(pig_id, qr_hash, ipfs_cid);
        emit QRCodeGenerated(pig_id, qr_hash, ipfs_cid);
    }

    function getPigData(uint256 pig_id) external view returns(uint256, bytes32, string memory) 
    {
        require(pigData[pig_id].pig_id != 0, "Pig ID does not exist");
        return (pigData[pig_id].pig_id, pigData[pig_id].pig_hash, pigData[pig_id].ipfs_cid);
    }

    function getVaccinationData(uint256 pig_id) external view returns(uint256, bytes32, string memory) 
    {
        require(vaccinationData[pig_id].pig_id != 0, "Pig ID does not exist");
        return (vaccinationData[pig_id].pig_id, vaccinationData[pig_id].vaccine_hash, vaccinationData[pig_id].ipfs_cid);
    }

    function getSalesData(uint256 pig_id) external view returns(uint256, bytes32, string memory) 
    {
        require(salesData[pig_id].pig_id != 0, "Pig ID does not exist");
        return (salesData[pig_id].pig_id, salesData[pig_id].sales_hash, salesData[pig_id].ipfs_cid);
    }

    function getQRData(uint256 pig_id) external view returns(uint256, bytes32, string memory) 
    {
        require(qrData[pig_id].pig_id != 0, "Pig ID does not exist");
        return (qrData[pig_id].pig_id, qrData[pig_id].qr_hash, qrData[pig_id].ipfs_cid);
    }
}
