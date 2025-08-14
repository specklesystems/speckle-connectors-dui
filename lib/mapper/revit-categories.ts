import type { CategoryOption } from './types'

/**
 * Hardcoded Revit BuiltInCategories for the Interop Lite mapper.
 */
export const REVIT_CATEGORIES: readonly CategoryOption[] = [
  // INFRASTRUCTURE
  { value: 'OST_BridgeAbutments', label: 'Bridge Abutments' },
  { value: 'OST_BridgeFraming', label: 'Bridge Framing' },
  { value: 'OST_BridgeBearings', label: 'Bridge Bearings' },
  { value: 'OST_BridgeCables', label: 'Bridge Cables' },
  { value: 'OST_BridgeDecks', label: 'Bridge Decks' },
  { value: 'OST_ExpansionJoints', label: 'Expansion Joints' },
  { value: 'OST_BridgePiers', label: 'Bridge Piers' },
  { value: 'OST_VibrationManagement', label: 'Vibration Management' },

  // ELECTRICAL
  { value: 'OST_AudioVisualDevices', label: 'Audio Visual Devices' },
  { value: 'OST_CableTray', label: 'Cable Tray' },
  { value: 'OST_CableTrayFitting', label: 'Cable Tray Fittings' },
  { value: 'OST_CommunicationDevices', label: 'Communication Devices' },
  { value: 'OST_Conduit', label: 'Conduits' },
  { value: 'OST_ConduitFitting', label: 'Conduit Fittings' },
  { value: 'OST_DataDevices', label: 'Data Devices' },
  { value: 'OST_ElectricalEquipment', label: 'Electrical Equipment' },
  { value: 'OST_ElectricalFixtures', label: 'Electrical Fixtures' },
  { value: 'OST_FireAlarmDevices', label: 'Fire Alarm Devices' },
  { value: 'OST_LightingDevices', label: 'Lighting Devices' },
  { value: 'OST_LightingFixtures', label: 'Lighting Fixtures' },
  { value: 'OST_NurseCallDevices', label: 'Nurse Call Devices' },
  { value: 'OST_SecurityDevices', label: 'Security Devices' },
  { value: 'OST_TelephoneDevices', label: 'Telephone Devices' },

  // ARCHITECTURAL
  { value: 'OST_Casework', label: 'Casework' },
  { value: 'OST_Ceilings', label: 'Ceilings' },
  { value: 'OST_Columns', label: 'Columns' },
  { value: 'OST_CurtainWallMullions', label: 'Curtain Wall Mullions' },
  { value: 'OST_CurtainWallPanels', label: 'Curtain Panels' },
  // OST_Curtain_Systems excluded as part of CNX-2299
  { value: 'OST_Doors', label: 'Doors' },
  { value: 'OST_Entourage', label: 'Entourage' },
  { value: 'OST_Floors', label: 'Floors' },
  { value: 'OST_FoodServiceEquipment', label: 'Food Service Equipment' },
  { value: 'OST_Furniture', label: 'Furniture' },
  { value: 'OST_FurnitureSystems', label: 'Furniture Systems' },
  { value: 'OST_Hardscape', label: 'Hardscape' },
  { value: 'OST_Parking', label: 'Parking' },
  { value: 'OST_Planting', label: 'Planting' },
  { value: 'OST_Railings', label: 'Railings' },
  { value: 'OST_Ramps', label: 'Ramps' },
  { value: 'OST_Roads', label: 'Roads' },
  { value: 'OST_Roofs', label: 'Roofs' },
  { value: 'OST_Site', label: 'Site' },
  { value: 'OST_SpecialityEquipment', label: 'Speciality Equipment' },
  { value: 'OST_Stairs', label: 'Stairs' },
  { value: 'OST_Topography', label: 'Topography' },
  { value: 'OST_Toposolid', label: 'Toposolid' },
  { value: 'OST_Walls', label: 'Walls' },
  { value: 'OST_Windows', label: 'Windows' },

  // STRUCTURAL
  // OST_StructuralColumns excluded as part of CNX-2299
  { value: 'OST_StructuralConnections', label: 'Structural Connections' },
  { value: 'OST_StructuralFoundation', label: 'Structural Foundations' },
  { value: 'OST_StructuralFraming', label: 'Structural Framing' },
  { value: 'OST_StructuralFramingSystem', label: 'Structural Beam Systems' },
  { value: 'OST_StructuralFabricAreas', label: 'Structural Fabric Areas' },
  { value: 'OST_Rebar', label: 'Rebar' },
  { value: 'OST_StructuralStiffener', label: 'Structural Stiffeners' },
  { value: 'OST_StructuralTendons', label: 'Structural Tendons' },
  { value: 'OST_StructuralTruss', label: 'Structural Trusses' },

  // MECHANICAL
  { value: 'OST_DuctAccessory', label: 'Duct Accessories' },
  { value: 'OST_DuctCurves', label: 'Ducts' },
  { value: 'OST_DuctFitting', label: 'Duct Fittings' },
  { value: 'OST_DuctSystem', label: 'Duct Systems' },
  { value: 'OST_MechanicalEquipment', label: 'Mechanical Equipment' },
  { value: 'OST_PlumbingEquipment', label: 'Plumbing Equipment' },
  { value: 'OST_PlumbingFixtures', label: 'Plumbing Fixtures' },

  // PIPING
  { value: 'OST_PipeAccessory', label: 'Pipe Accessories' },
  { value: 'OST_PipeCurves', label: 'Pipes' },
  { value: 'OST_PipeFitting', label: 'Pipe Fittings' },
  { value: 'OST_Sprinklers', label: 'Sprinklers' },

  // GENERAL/MULTI-DISCIPLINE
  { value: 'OST_FireProtection', label: 'Fire Protection' },
  { value: 'OST_GenericModel', label: 'Generic Models' },
  { value: 'OST_Lines', label: 'Lines' },
  { value: 'OST_Mass', label: 'Mass' },
  { value: 'OST_MedicalEquipment', label: 'Medical Equipment' },
  { value: 'OST_Parts', label: 'Parts' },
  { value: 'OST_Signage', label: 'Signage' },
  { value: 'OST_TemporaryStructure', label: 'Temporary Structures' },
  { value: 'OST_VerticalCirculation', label: 'Vertical Circulation' }
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
