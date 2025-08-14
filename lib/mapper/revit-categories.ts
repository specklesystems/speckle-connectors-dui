import type { CategoryOption } from './types'

/**
 * Hardcoded Revit BuiltInCategories for the Interop Lite mapper.
 */
export const REVIT_CATEGORIES: readonly CategoryOption[] = [
  // INFRASTRUCTURE
  { value: 'OST_BridgeAbutments', label: 'Abutments' },
  { value: 'OST_AbutmentFoundations', label: 'Abutment Foundations' },
  { value: 'OST_AbutmentPiles', label: 'Abutment Piles' },
  { value: 'OST_AbutmentWalls', label: 'Abutment Walls' },
  { value: 'OST_ApproachSlabs', label: 'Approach Slabs' },
  { value: 'OST_BridgeBearings', label: 'Bearings' },
  { value: 'OST_BridgeCables', label: 'Bridge Cables' },
  { value: 'OST_BridgeDecks', label: 'Bridge Decks' },
  { value: 'OST_BridgeFraming', label: 'Bridge Framing' },
  { value: 'OST_BridgeArches', label: 'Bridge Arches' },
  { value: 'OST_BridgeFramingCrossBracing', label: 'Bridge Framing - Cross Bracing' },
  { value: 'OST_BridgeFramingDiaphragms', label: 'Bridge Framing - Diaphragms' },
  { value: 'OST_BridgeGirders', label: 'Bridge Framing - Girders' },
  { value: 'OST_BridgeFramingTrusses', label: 'Bridge Framing - Trusses' },
  { value: 'OST_ExpansionJoints', label: 'Expansion Joints' },
  { value: 'OST_BridgePiers', label: 'Piers' },
  { value: 'OST_PierCaps', label: 'Pier Caps' },
  { value: 'OST_PierColumns', label: 'Pier Columns' },
  { value: 'OST_BridgeFoundations', label: 'Pier Foundations' },
  { value: 'OST_PierPiles', label: 'Pier Piles' },
  { value: 'OST_BridgeTowers', label: 'Pier Towers' },
  { value: 'OST_PierWalls', label: 'Pier Walls' },
  { value: 'OST_StructuralTendons', label: 'Structural Tendons' },
  { value: 'OST_VibrationManagement', label: 'Vibration Management' },
  { value: 'OST_VibrationDampers', label: 'Vibration Dampers' },
  { value: 'OST_VibrationIsolators', label: 'Vibration Isolators' },

  // ARCHITECTURE
  { value: 'OST_AudioVisualDevices', label: 'Audio Visual Devices' },
  { value: 'OST_Casework', label: 'Casework' },
  { value: 'OST_Ceilings', label: 'Ceilings' },
  { value: 'OST_Columns', label: 'Columns' },
  { value: 'OST_CurtainWallPanels', label: 'Curtain Panels' },
  // { value: 'OST_CurtaSystem', label: 'Curtain Systems' }, excluded as part of CNX-2299
  { value: 'OST_CurtainWallMullions', label: 'Curtain Wall Mullions' },
  { value: 'OST_Doors', label: 'Doors' },
  { value: 'OST_Entourage', label: 'Entourage' },
  { value: 'OST_FireProtection', label: 'Fire Protection' },
  { value: 'OST_Floors', label: 'Floors' },
  { value: 'OST_FoodServiceEquipment', label: 'Food Service Equipment' },
  { value: 'OST_Furniture', label: 'Furniture' },
  { value: 'OST_FurnitureSystems', label: 'Furniture Systems' },
  { value: 'OST_GenericModel', label: 'Generic Models' },
  { value: 'OST_Hardscape', label: 'Hardscape' },
  { value: 'OST_Lines', label: 'Lines' },
  { value: 'OST_Mass', label: 'Mass' },
  { value: 'OST_MechanicalControlDevices', label: 'Mechanical Control Devices' },
  { value: 'OST_MechanicalEquipment', label: 'Mechanical Equipment' },
  { value: 'OST_MedicalEquipment', label: 'Medical Equipment' },
  { value: 'OST_Parking', label: 'Parking' },
  { value: 'OST_Parts', label: 'Parts' },
  { value: 'OST_Planting', label: 'Planting' },
  { value: 'OST_PlumbingEquipment', label: 'Plumbing Equipment' },
  { value: 'OST_PlumbingFixtures', label: 'Plumbing Fixtures' },
  { value: 'OST_StairsRailing', label: 'Railings' },
  { value: 'OST_StairsRailingBaluster', label: 'Railings - Balusters' },
  { value: 'OST_RailingSupport', label: 'Railings - Supports' },
  { value: 'OST_RailingTermination', label: 'Railings - Terminations' },
  { value: 'OST_Ramps', label: 'Ramps' },
  { value: 'OST_Roads', label: 'Roads' },
  { value: 'OST_Roofs', label: 'Roofs' },
  { value: 'OST_Signage', label: 'Signage' },
  { value: 'OST_Site', label: 'Site' },
  { value: 'OST_SpecialtyEquipment', label: 'Specialty Equipment' },
  { value: 'OST_Stairs', label: 'Stairs' },
  { value: 'OST_TemporaryStructure', label: 'Temporary Structures' },
  { value: 'OST_Topography', label: 'Topography' },
  { value: 'OST_Toposolid', label: 'Toposolid' },
  { value: 'OST_VerticalCirculation', label: 'Vertical Circulation' },
  { value: 'OST_Walls', label: 'Walls' },
  { value: 'OST_Windows', label: 'Windows' },

  // ELECTRICAL
  { value: 'OST_CableTrayFitting', label: 'Cable Tray Fittings' },
  { value: 'OST_CableTray', label: 'Cable Trays' },
  { value: 'OST_CommunicationDevices', label: 'Communication Devices' },
  { value: 'OST_ConduitFittings', label: 'Conduit Fittings' },
  { value: 'OST_Conduit', label: 'Conduits' },
  { value: 'OST_DataDevices', label: 'Data Devices' },
  { value: 'OST_ElectricalEquipment', label: 'Electrical Equipment' },
  { value: 'OST_ElectricalFixtures', label: 'Electrical Fixtures' },
  { value: 'OST_FireAlarmDevices', label: 'Fire Alarm Devices' },
  { value: 'OST_LighintgDevices', label: 'Lighting Devices' },
  { value: 'OST_LightingFixtures', label: 'Lighting Fixtures' },
  { value: 'OST_NurseCallDevices', label: 'Nurse Call Devices' },
  { value: 'OST_SecurityDevices', label: 'Security Devices' },
  { value: 'OST_TelephoneDevices', label: 'Telephone Devices' },

  // STRUCTURE
  { value: 'OST_Coupler', label: 'Structural Rebar Couplers' },
  { value: 'OST_FabricAreas', label: 'Structural Fabric Areas' },
  { value: 'OST_StructConnections', label: 'Structural Connections' },
  { value: 'OST_StructConnectionAnchors', label: 'Structural Connections - Anchors' },
  { value: 'OST_StructConnectionBolts', label: 'Structural Connections - Bolts' },
  { value: 'OST_StructConnectionPlates', label: 'Structural Connections - Plates' },
  { value: 'OST_StructConnectionProfiles', label: 'Structural Connections - Profiles' },
  {
    value: 'OST_StructConnectionShearStuds',
    label: 'Structural Connections - Shear Studs'
  },
  { value: 'OST_StructConnectionWelds', label: 'Structural Connections - Welds' },
  // { value: 'OST_StructuralColumns', label: 'Structural Columns' }, excluded as part of CNX-2299
  { value: 'OST_StructuralFoundation', label: 'Structural Foundations' },
  { value: 'OST_StructuralFraming', label: 'Structural Framing' },
  { value: 'OST_StructuralTruss', label: 'Structural Trusses' },
  { value: 'OST_Rebar', label: 'Structural Rebar' },

  // MECHANICAL
  { value: 'OST_DuctTerminal', label: 'Air Terminals' },
  { value: 'OST_DuctAccessory', label: 'Duct Accessories' },
  { value: 'OST_DuctFitting', label: 'Duct Fittings' },
  { value: 'OST_PlaceHolderDucts', label: 'Duct Placeholders' },
  { value: 'OST_DuctCurves', label: 'Ducts' },
  { value: 'OST_MEPAncillaryFraming', label: 'MEP Ancillary Framing' },

  // PIPING
  { value: 'OST_PipeAccessory', label: 'Pipe Accessories' },
  { value: 'OST_PipeFitting', label: 'Pipe Fittings' },
  { value: 'OST_PlaceHolderPipes', label: 'Pipe Placeholders' },
  { value: 'OST_PipeSegments', label: 'Pipe Segments' },
  { value: 'OST_PipeCurves', label: 'Pipes' },
  { value: 'OST_Sprinklers', label: 'Sprinklers' },

  // GENERAL/MULTI-DISCIPLINE
  { value: 'OST_CableTrayRun', label: 'Cable Tray Runs' },
  { value: 'OST_Coordination_Model', label: 'Coordination Model' },
  { value: 'OST_DuctSystem', label: 'Duct Systems' },
  { value: 'OST_PipingSystem', label: 'Piping Systems' },
  { value: 'OST_StructuralFramingSystem', label: 'Structural Beam Systems' },
  { value: 'OST_StructuralStiffener', label: 'Structural Stiffeners' }
] as const

/**
 * Get available categories sorted alphabetically by label.
 */
export function getAvailableCategories(): CategoryOption[] {
  return [...REVIT_CATEGORIES].sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Gets the human-readable label for a category value.
 */
export function getCategoryLabel(categoryValue: string): string {
  const category = REVIT_CATEGORIES.find((c) => c.value === categoryValue)
  return category?.label ?? categoryValue
}
