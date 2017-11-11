export class Issuance {
    constructor(array) {
        this.description = array[0];
        this.code = array[1];
        this.originalOwner = array[2];
        this.originalSupply = array[3];
        this.auditTime = array[4];
        this.auditRemark = array[5];
        this.revoked = array[6];
    }
}