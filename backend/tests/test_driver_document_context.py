from pathlib import Path
from types import SimpleNamespace
import sys
import unittest


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.document_generator import (  # noqa: E402
    _driver_categories_for_documents,
    _driver_document_context_overrides,
    _driver_xml_context_overrides,
)


def client(admission_category="", indications=""):
    return SimpleNamespace(admission_category=admission_category, indications=indications)


def chairman(fields, *, is_completed=True):
    return SimpleNamespace(
        doctor_role_id="chairman",
        fields_json=fields,
        is_completed=is_completed,
    )


class DriverDocumentContextTests(unittest.TestCase):
    def test_completed_chairman_categories_override_client_categories(self):
        selected = _driver_categories_for_documents(
            client(admission_category="A B C D"),
            [chairman({"categoryB": True, "categoryC": True})],
        )

        self.assertEqual(selected, {"B", "C"})

    def test_falls_back_to_client_admission_category_without_completed_chairman(self):
        selected = _driver_categories_for_documents(
            client(admission_category="A B C1E Tm"),
            [chairman({"categoryD": True}, is_completed=False)],
        )

        self.assertEqual(selected, {"A", "B", "C1E", "Tm"})

    def test_legacy_category_e_expands_to_be_ce_de(self):
        selected = _driver_categories_for_documents(
            client(admission_category=""),
            [chairman({"categoryE": True})],
        )

        self.assertEqual(selected, {"BE", "CE", "DE"})

    def test_document_context_includes_categories_and_conditions(self):
        context = _driver_document_context_overrides(
            client(admission_category="A B C D"),
            [
                chairman(
                    {
                        "categoryB": True,
                        "categoryBE": True,
                        "categoryBoat": True,
                        "indicationManual": True,
                        "indicationAutomatic": False,
                        "indicationGlasses": True,
                        "restrictionAM": True,
                        "restrictionCCE": True,
                    }
                )
            ],
        )

        self.assertEqual(context["CategoryA"], "")
        self.assertEqual(context["CategoryB"], "X")
        self.assertEqual(context["BECalc"], "X")
        self.assertEqual(context["ManualControlCalc"], "true")
        self.assertEqual(context["AutomaticTransmissionCalc"], "false")
        self.assertEqual(context["VisionTCCalc"], "true")
        self.assertEqual(context["DriveShipCalc"], "true")
        self.assertEqual(context["TCA"], "X")
        self.assertEqual(context["TCB"], "")
        self.assertEqual(context["TCC"], "X")

    def test_xml_context_uses_boolean_categories_and_restrictions(self):
        test_client = client(admission_category="A B C D")
        exams = [
            chairman(
                {
                    "categoryB": True,
                    "categoryC1": True,
                    "indicationManual": True,
                    "restrictionAM": True,
                    "restrictionBBE": False,
                }
            )
        ]

        xml_context = _driver_xml_context_overrides({}, test_client, exams)

        self.assertEqual(xml_context["ACalc"], "false")
        self.assertEqual(xml_context["BCalc"], "true")
        self.assertEqual(xml_context["C1Calc"], "true")
        self.assertEqual(xml_context["ManualControlCalc"], "true")
        self.assertEqual(xml_context["AutomaticTransmissionCalc"], "false")
        self.assertEqual(xml_context["CategoryACalc"], "true")
        self.assertEqual(xml_context["CategoryBCalc"], "false")


if __name__ == "__main__":
    unittest.main()
