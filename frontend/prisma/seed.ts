import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.subObject.deleteMany();
  await prisma.project.deleteMany();
  await prisma.sapSystem.deleteMany();

  // Create SAP systems
  const devSystem = await prisma.sapSystem.create({
    data: {
      name: "DEV",
      url: "https://dev-sap.company.com:44300",
      user: "DEVELOPER",
      password: "dev_password_123",
      client: "100",
      language: "EN",
    },
  });

  const qasSystem = await prisma.sapSystem.create({
    data: {
      name: "QAS",
      url: "https://qas-sap.company.com:44300",
      user: "QAS_USER",
      password: "qas_password_456",
      client: "200",
      language: "EN",
    },
  });

  // Project 1: Completed report migration
  const project1 = await prisma.project.create({
    data: {
      name: "ZMY_REPORT",
      sourceSystemId: devSystem.id,
      targetSystemId: devSystem.id,
      objtype: "PROG/P",
      parentName: "$TMP",
      parentPath: "/sap/bc/adt/packages/%24tmp",
      description: "Legacy sales report migration",
      status: "completed",
      subObjects: {
        create: [
          {
            name: "ZMY_REPORT",
            objtype: "PROG/P",
            status: "activated",
            order: 0,
            parentObjectName: "ZMY_REPORT",
            parentObjectType: "PROG/P",
            objectOrder: 0,
            originalSource: "REPORT zmy_report.\n\nTABLES: vbak.\n\nSELECT * FROM vbak INTO TABLE @DATA(lt_orders).\nLOOP AT lt_orders INTO DATA(ls_order).\n  WRITE: / ls_order-vbeln.\nENDLOOP.",
            migratedSource: "REPORT zmy_report.\n\nSELECT vbeln, erdat, erzet, ernam\n  FROM vbak\n  INTO TABLE @DATA(lt_orders).\n\nLOOP AT lt_orders INTO DATA(ls_order).\n  WRITE: / ls_order-vbeln, ls_order-erdat.\nENDLOOP.",
          },
          {
            name: "ZMY_REPORT_TOP",
            objtype: "PROG/I",
            status: "activated",
            order: 1,
            parentObjectName: "ZMY_REPORT",
            parentObjectType: "PROG/P",
            objectOrder: 0,
            originalSource: "* TOP include for ZMY_REPORT\nTYPES: BEGIN OF ty_order,\n         vbeln TYPE vbak-vbeln,\n       END OF ty_order.",
            migratedSource: "* TOP include for ZMY_REPORT\nTYPES: BEGIN OF ty_order,\n         vbeln TYPE vbak-vbeln,\n         erdat TYPE vbak-erdat,\n       END OF ty_order.",
          },
        ],
      },
    },
  });

  // Project 2: Class migration in progress
  const project2 = await prisma.project.create({
    data: {
      name: "ZCL_ORDER_PROCESSOR",
      objtype: "CLAS/OC",
      sourceSystemId: devSystem.id,
      targetSystemId: qasSystem.id,
      parentName: "$TMP",
      parentPath: "/sap/bc/adt/packages/%24tmp",
      description: "Order processing class refactoring",
      status: "in_progress",
      subObjects: {
        create: [
          // Dependency: interface (objectOrder 0 — migrated first)
          {
            name: "ZIF_ORDER_PROCESSOR",
            objtype: "INTF/OI",
            status: "migrated",
            order: 0,
            parentObjectName: "ZIF_ORDER_PROCESSOR",
            parentObjectType: "INTF/OI",
            objectOrder: 0,
            originalSource: "",
            migratedSource: "INTERFACE zif_order_processor PUBLIC.\n  METHODS process_order IMPORTING iv_vbeln TYPE vbak-vbeln RAISING cx_static_check.\n  METHODS get_status RETURNING VALUE(rv_status) TYPE char10.\nENDINTERFACE.",
          },
          // Dependency: exception class (objectOrder 1) — auto-excluded (exists in target)
          {
            name: "ZCX_ORDER_ERROR",
            objtype: "CLAS/OC",
            status: "pending",
            order: 0,
            parentObjectName: "ZCX_ORDER_ERROR",
            parentObjectType: "CLAS/OC",
            objectOrder: 1,
            originalSource: "",
            migratedSource: "",
            excluded: true,
          },
          // Main class sub-objects (objectOrder 2)
          {
            name: "ZCL_ORDER_PROCESSOR",
            objtype: "CLAS/OC",
            status: "migrated",
            order: 0,
            parentObjectName: "ZCL_ORDER_PROCESSOR",
            parentObjectType: "CLAS/OC",
            objectOrder: 2,
            originalSource: 'CLASS zcl_order_processor DEFINITION PUBLIC.\n  PUBLIC SECTION.\n    METHODS process_order IMPORTING iv_vbeln TYPE vbak-vbeln.\n    METHODS get_status RETURNING VALUE(rv_status) TYPE char10.\nENDCLASS.\n\nCLASS zcl_order_processor IMPLEMENTATION.\n  METHOD process_order.\n    " legacy implementation\n  ENDMETHOD.\n  METHOD get_status.\n    rv_status = \'OK\'.\n  ENDMETHOD.\nENDCLASS.',
            migratedSource: 'CLASS zcl_order_processor DEFINITION PUBLIC.\n  PUBLIC SECTION.\n    METHODS process_order IMPORTING iv_vbeln TYPE vbak-vbeln RAISING cx_static_check.\n    METHODS get_status RETURNING VALUE(rv_status) TYPE char10.\n  PRIVATE SECTION.\n    DATA mo_logger TYPE REF TO if_logger.\nENDCLASS.\n\nCLASS zcl_order_processor IMPLEMENTATION.\n  METHOD process_order.\n    " refactored implementation\n  ENDMETHOD.\n  METHOD get_status.\n    rv_status = \'OK\'.\n  ENDMETHOD.\nENDCLASS.',
          },
          {
            name: "ZCL_ORDER_VALIDATOR",
            objtype: "CLAS/OC",
            status: "in_progress",
            order: 1,
            parentObjectName: "ZCL_ORDER_PROCESSOR",
            parentObjectType: "CLAS/OC",
            objectOrder: 2,
            originalSource: "CLASS zcl_order_validator DEFINITION PUBLIC.\n  PUBLIC SECTION.\n    METHODS validate IMPORTING iv_vbeln TYPE vbak-vbeln RETURNING VALUE(rv_valid) TYPE abap_bool.\nENDCLASS.\n\nCLASS zcl_order_validator IMPLEMENTATION.\n  METHOD validate.\n    rv_valid = abap_true.\n  ENDMETHOD.\nENDCLASS.",
            migratedSource: "",
          },
          {
            name: "ZCL_ORDER_LOGGER",
            objtype: "CLAS/OC",
            status: "pending",
            order: 2,
            parentObjectName: "ZCL_ORDER_PROCESSOR",
            parentObjectType: "CLAS/OC",
            objectOrder: 2,
            originalSource: "CLASS zcl_order_logger DEFINITION PUBLIC.\nENDCLASS.\nCLASS zcl_order_logger IMPLEMENTATION.\nENDCLASS.",
            migratedSource: "",
          },
        ],
      },
    },
  });

  // Project 3: Interface migration not started
  const project3 = await prisma.project.create({
    data: {
      name: "ZIF_PAYMENT_GATEWAY",
      objtype: "INTF/OI",
      parentName: "ZPAYMENTS",
      parentPath: "/sap/bc/adt/packages/zpayments",
      description: "Payment gateway interface modernization",
      transport: "DEVK900456",
      status: "open",
      subObjects: {
        create: [
          {
            name: "ZIF_PAYMENT_GATEWAY",
            objtype: "INTF/OI",
            status: "pending",
            order: 0,
            parentObjectName: "ZIF_PAYMENT_GATEWAY",
            parentObjectType: "INTF/OI",
            objectOrder: 0,
            originalSource: "INTERFACE zif_payment_gateway PUBLIC.\n  METHODS authorize IMPORTING iv_amount TYPE p RETURNING VALUE(rv_auth_code) TYPE string.\n  METHODS capture IMPORTING iv_auth_code TYPE string.\n  METHODS refund IMPORTING iv_amount TYPE p.\nENDINTERFACE.",
            migratedSource: "",
          },
        ],
      },
    },
  });

  // Add activity logs for project 2
  await prisma.activityLog.createMany({
    data: [
      {
        projectId: project2.id,
        type: "discovery",
        content: "Discovered 5 sub-objects: 1 interface, 3 classes, 1 exception class",
      },
      {
        projectId: project2.id,
        type: "write",
        content: "Generated migrated source for ZIF_ORDER_PROCESSOR",
      },
      {
        projectId: project2.id,
        type: "check",
        content: "Syntax check passed for ZIF_ORDER_PROCESSOR",
      },
      {
        projectId: project2.id,
        type: "activate",
        content: "Activated ZIF_ORDER_PROCESSOR successfully",
      },
      {
        projectId: project2.id,
        type: "write",
        content: "Generated migrated source for ZCL_ORDER_PROCESSOR",
      },
      {
        projectId: project2.id,
        type: "check",
        content: 'Syntax check found 1 error: line 8 - "MO_LOGGER is not typed correctly"',
      },
      {
        projectId: project2.id,
        type: "fix",
        content: "Fixed MO_LOGGER type declaration, retrying write and check",
      },
      {
        projectId: project2.id,
        type: "check",
        content: "Syntax check passed for ZCL_ORDER_PROCESSOR",
      },
      {
        projectId: project2.id,
        type: "info",
        content: "Starting migration of ZCL_ORDER_VALIDATOR...",
      },
    ],
  });

  // Add activity logs for project 1
  await prisma.activityLog.createMany({
    data: [
      {
        projectId: project1.id,
        type: "discovery",
        content: "Discovered 2 sub-objects: main program and TOP include",
      },
      {
        projectId: project1.id,
        type: "activate",
        content: "All objects activated. Migration complete.",
      },
    ],
  });

  // Seed default settings
  await prisma.setting.deleteMany();
  await prisma.setting.createMany({
    data: [
      { key: "llmProvider", value: "anthropic" },
      { key: "llmModel", value: "claude-sonnet-4-20250514" },
      { key: "globalMigrationRules", value: "Convert to clean ABAP syntax where possible. Use inline declarations. Replace obsolete statements (MOVE, COMPUTE) with modern equivalents." },
    ],
  });

  console.log("Seed data created:");
  console.log(`  System: ${devSystem.name} (${devSystem.url})`);
  console.log(`  System: ${qasSystem.name} (${qasSystem.url})`);
  console.log(`  Project 1: ${project1.name} (${project1.status}) [DEV -> DEV]`);
  console.log(`  Project 2: ${project2.name} (${project2.status}) [DEV -> QAS]`);
  console.log(`  Project 3: ${project3.name} (${project3.status}) [no systems]`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
