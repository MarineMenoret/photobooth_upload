const assert = require('assert');
const firebase = require('@firebase/testing');

const MY_PROJECT_ID = "angular-electron-5f77c";
const myId = "user_abc";
const theirId = "user_xyz";
const adminId = "user_admin";
const myAuth = {uid: myId, email: "abc@test.com"};
const theirAuth = {uid: theirId, email: "@test.com"};
const adminAuth = {uid: adminId, email: "admin@test.com"};

function getFirestore(auth){
    return firebase.initializeTestApp({projectId: MY_PROJECT_ID, auth: auth}).firestore();
}

function getAdminFirestore(){
    return firebase.initializeAdminApp({projectId: MY_PROJECT_ID}).firestore();
}

before (async() => {
    await firebase.clearFirestoreData({projectId: MY_PROJECT_ID});
});

describe("Photobooth upload", () => {
    
    it("Can write to a user document with the same ID as our user", async() => {
        const db = getFirestore(myAuth);
        const testDoc = db.collection("users").doc(myId);
        await firebase.assertSucceeds(testDoc.set({foo: "bar"}));
    });

    it("Admin role can write to a user document with the same ID as its own user", async() => {
        const db = getFirestore(adminAuth);
        const testDoc1 = db.collection("users").doc(adminId);
        await firebase.assertSucceeds(testDoc1.set({foo: "bar"}));
    });

    it("Can't write to a user document with a different ID as our user", async() => {
        const db = getFirestore(myAuth);
        const testDoc = db.collection("users").doc(theirId);
        await firebase.assertFails(testDoc.set({foo: "bar"}));
    });

    it("Can't write to a user admin document with a different ID as our user", async() => {
        const db = getFirestore(myAuth);
        const testDoc = db.collection("users").doc(adminId);
        await firebase.assertFails(testDoc.set({foo: "bar"}));
    });

    it("Can't write to a user document if not logged in", async() => {
        const db = getFirestore(null);
        const testDoc = db.collection("users").doc(theirId);
        await firebase.assertFails(testDoc.set({foo: "bar"}));
    });

    it("Can query personal projects", async() => {
        const db = getFirestore(myAuth);
        const testQuery = db.collection("projects").where("authorId", "==", myId);
        await firebase.assertSucceeds(testQuery.get());
    });

    it("Can't query all projects", async() => {
        const db = getFirestore(myAuth);
        const testQuery = db.collection("projects");
        await firebase.assertFails(testQuery.get());
    });

    it("Can't query all projects if not logged in", async() => {
        const db = getFirestore(null);
        const testQuery = db.collection("projects");
        await firebase.assertFails(testQuery.get());
    });

    it("Can't read a private project belonging to another user", async() => {
        const admin = getAdminFirestore();
        const projectId = "private_project";
        const setupDoc = admin.collection("projects").doc(projectId);
        await setupDoc.set({authorId: theirId, visibility: "private"});
        
        const db = getFirestore(myAuth);
        const testRead = db.collection("projects").doc(projectId);
        await firebase.assertFails(testRead.get());
    });

    it("Doesn't allow a user to edit somebody else's projects", async() => {
        const projectId = "project123";
        const admin = getAdminFirestore();
        await admin.collection("projects").doc(projectId).set({content: "before", authorId: theirId});

        const db = getFirestore(myAuth);
        const testDoc = db.collection("projects").doc(projectId);
        await firebase.assertFails(testDoc.update({content: "after"}));
    });

    it("Doesn't allow a non-logged in user to edit somebody else's projects", async() => {
        const projectId = "project123";
        const admin = getAdminFirestore();
        await admin.collection("projects").doc(projectId).set({content: "before", authorId: theirId});

        const db = getFirestore(null);
        const testDoc = db.collection("projects").doc(projectId);
        await firebase.assertFails(testDoc.update({content: "not logged in"}));
    });

    it("Allows admin to edit its own project", async() => {
        const projectId = "projectadmin";
        const admin = getAdminFirestore();
        await admin.collection("projects").doc(projectId).set({content: "before", authorId: adminId});

        const db = getFirestore(adminAuth);
        const testDoc = db.collection("projects").doc(projectId);
        await firebase.assertSucceeds(testDoc.update({content: "after"}));
    });

    it("Doesn't allow a user to create a project when they list somebody else as the author", async() => {
        const projectPath = "/projects/project_123";
        const db = getFirestore(myAuth);
        const testDoc = db.doc(projectPath);
        await firebase.assertFails(testDoc.set({authorId: theirId, content: "lorem ipsum"}));
    });

    it("Can't list all projects belonging to another user", async() => {
        const db = getFirestore(myAuth);
        const testRead = db.collection("projects").where("authorId", "==", theirId);
        await firebase.assertFails(testRead.get());
    });

    it("Can't list all projects", async() => {
        const db = getFirestore(myAuth);
        const testRead = db.collection("projects");
        await firebase.assertFails(testRead.get());
    });

    it("Super admin can create an admin role user", async() => {
        const db = getAdminFirestore();
        const testDoc = db.collection("admins").doc(adminId);
        await firebase.assertSucceeds(testDoc.set({content: "before"}));
    });

    it("Admin can't create an admin role user", async() => {
        const db = getFirestore(adminAuth);
        const testDoc = db.collection("admins").doc(myId);
        await firebase.assertFails(testDoc.set({content: "before"}));
    });

    it("Can't create an admin role user", async() => {
        const db = getFirestore(myAuth);
        const testDoc = db.collection("admins").doc(myId);
        await firebase.assertFails(testDoc.set({content: "before"}));
    });

    it("Can't create an admin role user if not logged in", async() => {
        const db = getFirestore(null);
        const testDoc = db.collection("admins").doc(myId);
        await firebase.assertFails(testDoc.set({content: "before"}));
    });

    it("Admin role can write to a user document with a different ID as our user", async() => {
        const db = getFirestore(adminAuth);
        const testDoc = db.collection("users").doc(myId);
        await firebase.assertSucceeds(testDoc.set({foo: "after"}));
    });

    it("Allows admin to edit somebody else's project", async() => {
        const projectId = "project_abc";
        const admin = getAdminFirestore();
        await admin.collection("projects").doc(projectId).set({content: "before", authorId: myId});

        const db = getFirestore(adminAuth);
        const testDoc = db.collection("projects").doc(projectId);
        await firebase.assertSucceeds(testDoc.update({content: "after"}));
    });

    it("Can query all projects if is an admin", async() => {
        const db = getFirestore(adminAuth);
        const testQuery = db.collection("projects");
        await firebase.assertSucceeds(testQuery.get());
    });

});

// after(async() => {
//     await firebase.clearFirestoreData({projectId: MY_PROJECT_ID});
// });